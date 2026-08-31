export function createRealtimeAdapter(supabaseClient) {
  if (!supabaseClient) return null;
  return {
    subscribe(sessionId, onMessage, onError) {
      const ch = supabaseClient
        .channel(`webchat:${sessionId}`)
        .on('broadcast', { event: 'webchat_message_available' }, (payload) => {
          onMessage?.(payload?.payload ?? payload);
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            onError?.(status);
          }
        });
      return () => { supabaseClient.removeChannel(ch); };
    },
  };
}
