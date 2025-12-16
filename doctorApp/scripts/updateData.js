const fs = require('fs');
const path = require('path');

try {
    // Go up one level from scripts/ to root
    const rootDir = path.join(__dirname, '..');
    const csvPath = path.join(rootDir, 'assets', 'datasdt.csv');
    console.log('Reading CSV from:', csvPath);

    if (!fs.existsSync(csvPath)) {
        console.error('Error: assets/datasdt.csv not found!');
        process.exit(1);
    }

    const csvContent = fs.readFileSync(csvPath, 'utf8');

    // Escape backticks in content just in case
    const escapedContent = csvContent.replace(/`/g, '\\`');

    const tsContent = `export const studentsCSV = \`${escapedContent}\`;`;

    const outputPath = path.join(rootDir, 'services', 'studentsData.ts');
    fs.writeFileSync(outputPath, tsContent);

    console.log('✅ Successfully converted CSV to services/studentsData.ts');
    console.log('You can now use the student data in the app.');
} catch (error) {
    console.error('Error converting CSV:', error);
}
