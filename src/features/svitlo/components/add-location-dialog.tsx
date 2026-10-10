import { LocationDialog } from './location-dialog';

export function AddLocationDialog({ queues, onClose }: { queues: string[]; onClose: () => void }) {
  return <LocationDialog queues={queues} onClose={onClose} />;
}
