# PRD: RepoPulse

## Problem
Developers with many GitHub repos lose track of which are alive and which are dead.

## Goal
Connect a GitHub account, see every repo grouped by how recently you committed to it, and label each repo your own way.

## Users
Solo developers, freelancers, students, small-team leads with 10+ repos.

## Core features (POC)
1. Connect with a GitHub personal access token (env var in POC, OAuth in phase 2).
2. Sync: pull repos plus the last 30 days of the user's commits per repo.
3. Status per repo from days since last commit:
   - Active: 0-7 days
   - Cooling: 8-14 days
   - Stale: 15-30 days
   - Dead: 30+ days (or no commits)
4. Grouped list, most active first. Each repo shows a 30-day commit strip.
5. Custom labels per repo (application, web app, ERP, library, anything typed).

## Not in POC
Multi-user auth, teams, notifications, GitLab/Bitbucket, filters (phase 1).

## Success
The user opens the app and in under 10 seconds knows what they are working on and what they abandoned.

## Copy rules
Plain words: "Last commit 12 days ago". Errors say what failed and what to do.
