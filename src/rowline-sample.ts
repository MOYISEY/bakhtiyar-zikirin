import { t } from './preferences';

// A deliberately fixed, synthetic example. This is not the Rowline import engine.
export function initRowlineSample() {
  const fix = document.querySelector<HTMLButtonElement>('#sample-fix')!;
  const exportButton = document.querySelector<HTMLButtonElement>('#sample-export')!;
  const sku = document.querySelector<HTMLElement>('#sample-sku')!;
  const label = document.querySelector<HTMLElement>('#sample-trim-label')!;
  const status = document.querySelector<HTMLElement>('#sample-status')!;
  const row = document.querySelector<HTMLElement>('.sample-trim-row')!;
  let trimmed = false;
  let statusKey = 'sample.statusInitial';
  function render() {
    sku.textContent = trimmed ? '00124' : '·00124·';
    label.textContent = t(trimmed ? 'sample.valid' : 'sample.spaces');
    fix.querySelector('span')!.textContent = t(trimmed ? 'sample.undo' : 'sample.fix');
    fix.setAttribute('aria-pressed', String(trimmed));
    row.classList.toggle('is-trimmed', trimmed);
    status.textContent = t(statusKey);
  }
  fix.addEventListener('click', () => {
    trimmed = !trimmed;
    statusKey = trimmed ? 'sample.statusFixed' : 'sample.statusInitial';
    render();
  });
  exportButton.addEventListener('click', () => {
    const records = [{ sku: trimmed ? '00124' : ' 00124 ', stock: '12' }, { sku: '00125', stock: '8' }, { sku: '', stock: '6' }];
    const csv = ['sku,stock', ...records.filter(record => record.sku.trim()).map(record => `"${record.sku}",${record.stock}`)].join('\r\n') + '\r\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rowline-synthetic-example.csv';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    statusKey = 'sample.statusExport';
    render();
  });
  window.addEventListener('portfolio:preferences', render);
  render();
}
