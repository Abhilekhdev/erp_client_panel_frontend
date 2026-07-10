import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownCircle, Hourglass } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api/axios';
import { clockIn, clockOut, getClockStatus } from '../attendance.api';

/** Live HH:MM:SS since clock-in — ticks every second (the enhancement GOURI lacks). */
function useElapsed(clockInTime: string | null): string {
  const [, force] = useState(0);
  useEffect(() => {
    if (!clockInTime) return;
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [clockInTime]);
  if (!clockInTime) return '';
  const secs = Math.max(0, Math.floor((Date.now() - new Date(clockInTime).getTime()) / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(secs / 3600))}:${p(Math.floor((secs % 3600) / 60))}:${p(secs % 60)}`;
}

export function ClockInOut() {
  const qc = useQueryClient();
  const { data: status } = useQuery({ queryKey: ['clock-status'], queryFn: getClockStatus });
  const clockedIn = Boolean(status?.clockedIn);
  const elapsed = useElapsed(clockedIn ? (status?.clockInTime ?? null) : null);

  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['clock-status'] });
    qc.invalidateQueries({ queryKey: ['attendance'] });
  };
  const inMut = useMutation({
    mutationFn: () => clockIn({ note }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
    },
    onError: (e) => window.alert(getApiErrorMessage(e, 'Could not clock in')),
  });
  const outMut = useMutation({
    mutationFn: () => clockOut({ note }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
    },
    onError: (e) => window.alert(getApiErrorMessage(e, 'Could not clock out')),
  });

  const openModal = () => {
    setNote('');
    setOpen(true);
  };

  return (
    <div className="mb-6 flex flex-col items-center gap-2">
      {clockedIn ? (
        <>
          <button
            type="button"
            onClick={openModal}
            className="flex flex-col items-center gap-1 rounded-xl bg-amber-500 px-8 py-3 text-white shadow-sm transition hover:bg-amber-600"
          >
            <Hourglass className="h-6 w-6 animate-spin" style={{ animationDuration: '2s' }} />
            <span className="font-medium">Clock Out</span>
          </button>
          <div className="text-center">
            <div className="font-mono text-2xl font-semibold tabular-nums">{elapsed}</div>
            <div className="text-xs text-muted-foreground">
              Clocked in at{' '}
              {status?.clockInTime ? new Date(status.clockInTime).toLocaleTimeString() : ''}
            </div>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={openModal}
          className="flex flex-col items-center gap-1 rounded-xl bg-sky-600 px-8 py-3 text-white shadow-sm transition hover:bg-sky-700"
        >
          <ArrowDownCircle className="h-6 w-6" />
          <span className="font-medium">Clock In</span>
        </button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={clockedIn ? 'Clock out' : 'Clock in'}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => (clockedIn ? outMut : inMut).mutate()}
              isLoading={inMut.isPending || outMut.isPending}
            >
              Submit
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{clockedIn ? 'Clock out note' : 'Clock in note'}</Label>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
