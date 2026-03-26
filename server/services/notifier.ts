import axios from 'axios';
import { getSettings } from './settings';

export const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export const notifyTelegram = async (message: string) => {
  const settings = getSettings();
  if (!settings.telegram.enabled || !settings.telegram.botToken || !settings.telegram.chatId) return;

  try {
    const url = `https://api.telegram.org/bot${settings.telegram.botToken}/sendMessage`;
    await axios.post(url, {
      chat_id: settings.telegram.chatId,
      text: message,
      parse_mode: 'HTML'
    });
  } catch (error: any) {
    console.error('Telegram notification failed:', error.response?.data || error.message);
  }
};

export const notifyDiscord = async (content: string, embed?: any) => {
  const settings = getSettings();
  if (!settings.discord.enabled || !settings.discord.webhookUrl) return;

  try {
    const payload: any = { content };
    if (embed) payload.embeds = [embed];
    
    await axios.post(settings.discord.webhookUrl, payload);
  } catch (error: any) {
    console.error('Discord notification failed:', error.response?.data || error.message);
  }
};

export const notifyCustomWebhook = async (transaction: any) => {
  const settings = getSettings();
  if (!settings.customWebhook.enabled || !settings.customWebhook.url) return;

  try {
    const headers: any = { 'Content-Type': 'application/json' };
    if (settings.customWebhook.secret) {
      headers['X-Webhook-Secret'] = settings.customWebhook.secret;
    }

    await axios.post(settings.customWebhook.url, transaction, { headers, timeout: 5000 });
  } catch (error: any) {
    console.error('Custom webhook failed:', error.message);
  }
};

export const triggerTestNotification = async () => {
  const testTx = {
    transactionId: 'TEST-' + Date.now(),
    refNo: 'TEST-' + Date.now(),
    creditAmount: 50000,
    debitAmount: 0,
    description: 'TEST NOTIFICATION MB BANK TOOL PRO',
    transactionDate: new Date().toLocaleString(),
    accountNo: '0987654321',
  };

  await broadcastTransaction(testTx, true);
  return { success: true };
};

export const broadcastTransaction = async (tx: any, isTest = false) => {
  const isCredit = tx.creditAmount > 0;
  const amount = isCredit ? tx.creditAmount : tx.debitAmount;
  const typeStr = isCredit ? 'Nhận tiền (+)' : 'Trừ tiền (-)';
  const emoji = isCredit ? '🟢' : '🔴';
  
  const title = isTest ? '🔔 TEST NOTIFICATION' : `🔔 BIẾN ĐỘNG SỐ DƯ`;

  // Telegram format
  const telegramMsg = `<b>${title}</b>\n\n` +
    `🏦 <b>Tài khoản:</b> ${tx.accountNo}\n` +
    `📅 <b>Thời gian:</b> ${tx.transactionDate}\n` +
    `💳 <b>Loại:</b> ${emoji} ${typeStr}\n` +
    `💰 <b>Số tiền:</b> ${formatMoney(amount)}\n` +
    `📝 <b>Nội dung:</b> <i>${tx.description}</i>\n` +
    `🔖 <b>Mã GD:</b> <code>${tx.refNo}</code>`;

  // Discord format
  const discordEmbed = {
    title: title,
    color: isCredit ? 0x67c23a : 0xf56c6c,
    fields: [
      { name: 'Tài khoản', value: tx.accountNo || 'Unknown', inline: true },
      { name: 'Loại', value: `${emoji} ${typeStr}`, inline: true },
      { name: 'Số tiền', value: formatMoney(amount), inline: true },
      { name: 'Nội dung', value: tx.description || 'N/A' },
      { name: 'Mã GD', value: tx.refNo || 'N/A', inline: true },
      { name: 'Thời gian', value: tx.transactionDate || 'N/A', inline: true }
    ],
    footer: { text: 'MB Bank Tool PRO' },
    timestamp: new Date().toISOString()
  };

  const promises = [
    notifyTelegram(telegramMsg),
    notifyDiscord('', discordEmbed),
    notifyCustomWebhook(tx)
  ];

  await Promise.allSettled(promises);
};
