import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/react';
import { useLocation } from 'wouter';
import { getGetFavoritesQueryKey, useAddFavorite, useGetFavorites, useRemoveFavorite } from '@workspace/api-client-react';
import type { Listing } from '@workspace/api-client-react';
import { toast } from '@/hooks/use-toast';
import { friendlyError } from '@/lib/errors';

/** One place that handles "Save for later": instant UI, a confirmation toast, and honest errors. */
export function useSaveToggle(item: Pick<Listing, 'id' | 'title'>) {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const favorites = useGetFavorites({ query: { enabled: Boolean(user), queryKey: getGetFavoritesQueryKey() } });
  const serverSaved = Array.isArray(favorites.data) && favorites.data.some(f => f.id === item.id);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  useEffect(() => { setOptimistic(null); }, [serverSaved]);
  const add = useAddFavorite();
  const remove = useRemoveFavorite();

  const toggle = () => {
    if (!user) { setLocation('/sign-in'); return; }
    const next = !(optimistic ?? serverSaved);
    setOptimistic(next);
    (next ? add : remove).mutate({ id: item.id }, {
      onSuccess: async () => {
        await qc.invalidateQueries({ queryKey: getGetFavoritesQueryKey() });
        toast({ title: next ? 'Saved for later' : 'Removed from saved', description: item.title });
      },
      onError: error => {
        setOptimistic(null);
        toast({ variant: 'destructive', title: friendlyError(error, 'Couldn’t update your saved items') });
      },
    });
  };
  return { saved: optimistic ?? serverSaved, toggle, busy: add.isPending || remove.isPending };
}
