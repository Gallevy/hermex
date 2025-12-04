export function printSummary() {
  console.log(chalk.bold('📈 SUMMARY'));
  console.log(`  Total Components: ${Object.keys(componentData).length}`);
  console.log(`  Total Imports: ${Object.keys(importData).length}`);
  console.log(`  Files Analyzed: ${files.length}`);
  console.log(`  Sort: ${options.sort}`);
}
