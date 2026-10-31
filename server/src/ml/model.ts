/**
 * Lightweight per-user Multinomial Logistic Regression model for verdict prediction.
 * Handles class imbalance, concept drift, and small datasets with L2 regularization.
 */

import { FEATURE_NAMES, vectorizeFeatures, explainTopContributingFeatures } from './features.js';
import type {
  Verdict,
  VerdictFeatures,
  VerdictSuggestion,
  TrainedModelWeights,
} from './types.js';

export const VERDICT_CLASSES: Verdict[] = ['keep', 'pause', 'retire'];
export const MIN_DECISIONS_REQUIRED = 30;

export interface TrainingSample {
  features: VerdictFeatures;
  verdict: Verdict;
  createdAt?: string | Date;
}

/**
 * Softmax function with numerical stability trick (subtract max logit)
 */
export function softmax(logits: number[]): number[] {
  const maxLogit = Math.max(...logits);
  const exps = logits.map((z) => Math.exp(Math.max(-50, Math.min(50, z - maxLogit))));
  const sumExps = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => (sumExps > 0 ? e / sumExps : 1 / logits.length));
}

/**
 * Trains a Multinomial Logistic Regression model on user verdict history
 */
export function trainVerdictModel(
  samples: TrainingSample[],
  now = Date.now()
): TrainedModelWeights {
  const numClasses = VERDICT_CLASSES.length; // 3: keep, pause, retire
  const numFeatures = FEATURE_NAMES.length; // 20

  // 1. Prepare vectors and targets
  const X: number[][] = [];
  const y: number[] = [];
  const sampleWeights: number[] = [];

  // Compute class distributions for class imbalance mitigation
  const classCounts = [0, 0, 0];
  for (const s of samples) {
    const classIdx = VERDICT_CLASSES.indexOf(s.verdict);
    if (classIdx !== -1) {
      classCounts[classIdx]++;
    }
  }

  const N = samples.length;
  // Inverse frequency class weights: N / (3 * count)
  const classWeights = classCounts.map((count) =>
    count > 0 ? N / (numClasses * count) : 1.0
  );

  for (const s of samples) {
    const classIdx = VERDICT_CLASSES.indexOf(s.verdict);
    if (classIdx === -1) continue;

    const x = vectorizeFeatures(s.features);
    X.push(x);
    y.push(classIdx);

    // Concept drift: Exponential decay for older decisions
    // Samples within the last 30 days have weight ~1.0; 180 days ago ~0.60
    let daysAgo = 15;
    if (s.createdAt) {
      const t = new Date(s.createdAt).getTime();
      if (!isNaN(t)) {
        daysAgo = Math.max(0, Math.floor((now - t) / 864e5));
      }
    }
    const timeDecayWeight = Math.exp(-0.003 * daysAgo); // Half-life ~230 days

    // Combined weight = class balancing weight * time decay weight
    sampleWeights.push(classWeights[classIdx] * timeDecayWeight);
  }

  // 2. Initialize weights and biases
  // weights[classIndex][featureIndex]
  const weights: number[][] = Array.from({ length: numClasses }, () =>
    new Array(numFeatures).fill(0)
  );
  const biases: number[] = new Array(numClasses).fill(0);

  // 3. Mini-batch or full Gradient Descent with L2 regularization
  const epochs = 250;
  const learningRate = 0.12;
  const l2Penalty = 0.02; // Small dataset regularizer to prevent overfitting
  let totalLoss = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    totalLoss = 0;
    // Gradient accumulators
    const dW: number[][] = Array.from({ length: numClasses }, () =>
      new Array(numFeatures).fill(0)
    );
    const dB: number[] = new Array(numClasses).fill(0);

    const lr = learningRate / (1 + 0.005 * epoch); // Learning rate annealing

    for (let i = 0; i < X.length; i++) {
      const xi = X[i]!;
      const yi = y[i]!;
      const wi = sampleWeights[i]!;

      // Forward pass: compute logits
      const logits: number[] = new Array(numClasses).fill(0);
      for (let c = 0; c < numClasses; c++) {
        let dot = biases[c]!;
        const wc = weights[c]!;
        for (let j = 0; j < numFeatures; j++) {
          dot += wc[j]! * xi[j]!;
        }
        logits[c] = dot;
      }

      // Probabilities via Softmax
      const probs = softmax(logits);

      // Cross-entropy loss with sample weight
      totalLoss -= wi * Math.log(Math.max(1e-12, probs[yi]!));

      // Compute gradients: dL/dz = prob - 1 (for true class), else prob
      for (let c = 0; c < numClasses; c++) {
        const target = c === yi ? 1.0 : 0.0;
        const err = wi * (probs[c]! - target);

        dB[c] += err;
        const dwc = dW[c]!;
        for (let j = 0; j < numFeatures; j++) {
          dwc[j] += err * xi[j]!;
        }
      }
    }

    // Apply gradient update with L2 regularization penalty
    const batchScale = 1 / Math.max(1, X.length);
    for (let c = 0; c < numClasses; c++) {
      biases[c] -= lr * dB[c]! * batchScale;
      const wc = weights[c]!;
      const dwc = dW[c]!;
      for (let j = 0; j < numFeatures; j++) {
        // gradient + l2_penalty * weight
        const reg = l2Penalty * wc[j]!;
        wc[j] -= lr * (dwc[j]! * batchScale + reg);
      }
    }
  }

  return {
    classes: VERDICT_CLASSES,
    featureNames: [...FEATURE_NAMES],
    weights,
    biases,
    trainedAt: new Date(now).toISOString(),
    samplesCount: X.length,
    loss: Number((totalLoss / Math.max(1, X.length)).toFixed(4)),
  };
}

/**
 * Predicts verdict probabilities and top contributing features using trained model weights
 */
export function predictWithModel(
  features: VerdictFeatures,
  model: TrainedModelWeights,
  decisionCount: number
): VerdictSuggestion {
  const x = vectorizeFeatures(features);
  const numClasses = model.classes.length;
  const numFeatures = model.featureNames.length;

  const logits: number[] = new Array(numClasses).fill(0);
  for (let c = 0; c < numClasses; c++) {
    let dot = model.biases[c] ?? 0;
    const wc = model.weights[c] || [];
    for (let j = 0; j < numFeatures; j++) {
      dot += (wc[j] ?? 0) * (x[j] ?? 0);
    }
    logits[c] = dot;
  }

  const probs = softmax(logits);
  const probKeep = Number((probs[0] ?? 0.33).toFixed(3));
  const probPause = Number((probs[1] ?? 0.33).toFixed(3));
  const probRetire = Number((probs[2] ?? 0.33).toFixed(3));

  // Determine top class
  let maxIdx = 0;
  let maxProb = probs[0] ?? 0;
  for (let c = 1; c < numClasses; c++) {
    if ((probs[c] ?? 0) > maxProb) {
      maxProb = probs[c] ?? 0;
      maxIdx = c;
    }
  }

  const predictedVerdict: Verdict = model.classes[maxIdx] || 'keep';
  const confidence = Number(maxProb.toFixed(2));

  // Feature contribution analysis for the predicted class
  const winningWeights = model.weights[maxIdx] || [];
  const contributions: { name: string; score: number }[] = [];

  for (let j = 0; j < numFeatures; j++) {
    const featureName = model.featureNames[j] || `feature_${j}`;
    const weight = winningWeights[j] ?? 0;
    const val = x[j] ?? 0;
    // Impact score
    const impact = weight * val;
    contributions.push({ name: featureName, score: impact });
  }

  // Sort by highest positive impact on the verdict
  contributions.sort((a, b) => b.score - a.score);

  const { explanation, contributingFeatures } = explainTopContributingFeatures(
    features,
    predictedVerdict,
    contributions
  );

  return {
    verdict: predictedVerdict,
    confidence,
    probabilities: {
      keep: probKeep,
      pause: probPause,
      retire: probRetire,
    },
    explanation,
    contributingFeatures,
    source: 'ml_model',
    decisionCount,
  };
}
