import { getSettings } from './settings';
import { broadcastTransaction } from './notifier';
import { CoreBankService } from './core-bank';

export class TransactionMonitor {
  private timer: NodeJS.Timeout | null = null;
  private seenTxIds = new Set<string>();
  private coreBankService: CoreBankService;

  constructor(coreBankService: CoreBankService) {
    this.coreBankService = coreBankService;
    
    // Auto start if enabled
    const settings = getSettings();
    if (settings.monitor.running) {
      this.start();
    }
  }

  public start() {
    if (this.timer) return;
    console.log('🚀 Starting Core Bank Transaction Monitor...');
    this.tick(); // Run immediately
  }

  public stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log('🛑 Stopped Core Bank Transaction Monitor.');
  }

  private async tick() {
    try {
      const settings = getSettings();
      if (!settings.monitor.running) {
        this.stop();
        return;
      }

      await this.checkTransactions();

    } catch (error: any) {
      console.error('Monitor tick failed:', error.message);
    } finally {
      // Schedule next tick
      const settings = getSettings();
      if (settings.monitor.running) {
        const interval = Math.max(10, settings.monitor.intervalSeconds) * 1000;
        this.timer = setTimeout(() => this.tick(), interval);
      }
    }
  }

  private async checkTransactions() {
    // 1. Ensure logged in
    const session = this.coreBankService.getSession();
    if (!session?.sessionId) {
      return;
    }

    // 2. Get first account
    const balanceResp = await this.coreBankService.getBalance();
    const accountList = (balanceResp as any).accountList || [];
    if (!accountList.length) return;

    const mainAccount = accountList[0].accountNo;

    // 3. Get transactions for today
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

    const txResp = await this.coreBankService.getTransactions(mainAccount, todayStr, todayStr);
    const txList = (txResp as any).transactionHistoryList || [];

    // Reverse to process oldest first (chronological order)
    const chronologicalTx = [...txList].reverse();

    for (const tx of chronologicalTx) {
      // Use refNo or a composite ID as unique identifier
      const txId = tx.refNo || `${tx.transactionDate}-${tx.creditAmount}-${tx.debitAmount}`;
      
      if (!this.seenTxIds.has(txId)) {
        this.seenTxIds.add(txId);
        
        // Broadcast new transaction!
        console.log(`🔔 New transaction detected: ${txId}`);
        await broadcastTransaction({ ...tx, accountNo: mainAccount });
      }
    }
  }
}
