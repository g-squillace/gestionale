import XLSX from 'xlsx';

const workbook = XLSX.readFile('/Users/guidosquillace/Downloads/Gestione Magazzino 2.0.xlsx');

console.log('Fogli trovati:', workbook.SheetNames);
console.log('\n');

for (const sheetName of workbook.SheetNames) {
  console.log(`=== ${sheetName} ===`);
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Mostra prime 10 righe
  data.slice(0, 15).forEach((row, i) => {
    console.log(`Riga ${i}:`, JSON.stringify(row));
  });
  console.log(`... (${data.length} righe totali)\n`);
}
