export function printTopUsage() {
  console.log('🏆 TOP COMPONENTS');

  topComponents.forEach(([comp, count], idx) => {
    const rank = idx + 1;
    const emoji =
      rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '  ';
    console.log(
      `  ${emoji} ${rank}. ${chalk.green(comp)}: ${chalk.yellow(count)} uses`,
    );
  });
}
