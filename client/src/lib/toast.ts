import { toast } from 'sonner';

export function showAppToast(message: string) {
  toast.message(message, { duration: 4000 });
}
