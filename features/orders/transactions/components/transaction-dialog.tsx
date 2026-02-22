'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { useState } from 'react';
import { Transaction } from '../types';

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  action: 'refund' | 'complete' | 'fail';
  onConfirm: (data: { amount?: number; reason?: string }) => Promise<void>;
}

export default function TransactionDialog({
  open,
  onOpenChange,
  transaction,
  action,
  onConfirm,
}: TransactionDialogProps) {
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!transaction) return null;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      
      const data: { amount?: number; reason?: string } = {};
      
      if (action === 'refund') {
        // Parse amount if provided, otherwise refund full amount
        data.amount = amount ? parseFloat(amount) : undefined;
        data.reason = reason || undefined;
      } else if (action === 'fail') {
        data.reason = reason || undefined;
      }
      
      await onConfirm(data);
      
      // Reset form
      setAmount('');
      setReason('');
      onOpenChange(false);
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (action) {
      case 'refund':
        return 'Refund Transaction';
      case 'complete':
        return 'Mark Transaction as Completed';
      case 'fail':
        return 'Mark Transaction as Failed';
      default:
        return 'Confirm Action';
    }
  };

  const getDescription = () => {
    switch (action) {
      case 'refund':
        return `Are you sure you want to refund this transaction? This action cannot be undone.`;
      case 'complete':
        return `Are you sure you want to mark this transaction as completed? This action cannot be undone.`;
      case 'fail':
        return `Are you sure you want to mark this transaction as failed? This action cannot be undone.`;
      default:
        return 'Please confirm this action.';
    }
  };

  const getButtonText = () => {
    switch (action) {
      case 'refund':
        return 'Refund';
      case 'complete':
        return 'Mark Completed';
      case 'fail':
        return 'Mark Failed';
      default:
        return 'Confirm';
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{getTitle()}</AlertDialogTitle>
          <AlertDialogDescription>
            {getDescription()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          {action === 'refund' && (
            <div className="space-y-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="amount">Refund Amount</Label>
                <Input
                  id="amount"
                  placeholder={`Enter amount (max: ${transaction.amount})`}
                  value={amount}
                  onChange={(e) => {
                    // Only allow numbers and decimal point
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    setAmount(value);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to refund the full amount: {new Intl.NumberFormat('en-US', { style: 'currency', currency: transaction.currency }).format(transaction.amount)}
                </p>
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="reason">Refund Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter refund reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>
          )}
          
          {action === 'fail' && (
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="reason">Failure Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter failure reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}
          
          {action === 'complete' && (
            <p className="text-sm text-muted-foreground">
              This will mark transaction {transaction.transaction_id} as completed.
            </p>
          )}
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <Button 
            onClick={handleConfirm} 
            disabled={isSubmitting}
            variant={action === 'fail' ? 'destructive' : 'default'}
          >
            {isSubmitting ? 'Processing...' : getButtonText()}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
