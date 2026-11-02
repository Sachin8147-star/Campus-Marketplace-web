import { Link } from 'wouter';
import { Compass } from 'lucide-react';
import { AppPage } from '@/components/shell';

export default function NotFound() {
  return (
    <AppPage>
      <div className="state-card">
        <div className="state-icon"><Compass /></div>
        <h3>This shelf doesn’t exist.</h3>
        <p>The page you’re looking for has moved, or the link isn’t quite right.</p>
        <Link href="/" className="button button-primary">Back to the shelves</Link>
      </div>
    </AppPage>
  );
}
