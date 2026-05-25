const MAX_DICE_COUNT = 100;
const MAX_DICE_SIDES = 1_000;

function rollDice(notation) {
  const match = notation.trim().toLowerCase().match(/^(\d+)d(\d+)$/);

  if (!match) {
    return null;
  }

  const count = Number(match[1]);
  const sides = Number(match[2]);

  if (
    !Number.isSafeInteger(count)
    || !Number.isSafeInteger(sides)
    || count < 1
    || sides < 2
    || count > MAX_DICE_COUNT
    || sides > MAX_DICE_SIDES
  ) {
    return null;
  }

  const results = Array.from(
    { length: count },
    () => Math.floor(Math.random() * sides) + 1,
  );
  const total = results.reduce((sum, result) => sum + result, 0);

  return {
    count,
    results,
    sides,
    total,
  };
}

function formatDiceRoll(roll) {
  const visibleResults = roll.results.slice(0, 50).join(", ");
  const hiddenCount = roll.results.length - 50;
  const resultText = hiddenCount > 0
    ? `${visibleResults}, ...and ${hiddenCount} more`
    : visibleResults;

  return `Rolled **${roll.count}d${roll.sides}**: ${resultText}\nTotal: **${roll.total}**`;
}

async function handleDiceRoll(interaction) {
  const notation = interaction.options.getString("dice", true);
  const roll = rollDice(notation);

  if (!roll) {
    await interaction.reply({
      content: `Use dice notation like \`2d6\`. Limits: ${MAX_DICE_COUNT} dice, ${MAX_DICE_SIDES} sides.`,
      ephemeral: true,
    });
    return;
  }

  await interaction.reply(formatDiceRoll(roll));
}

async function handleDiceMessage(message) {
  if (message.author.bot || !message.content.startsWith("/r ")) {
    return;
  }

  const notation = message.content.slice(3).trim();
  const roll = rollDice(notation);

  if (!roll) {
    await message.reply(`Use dice notation like \`/r 2d6\`. Limits: ${MAX_DICE_COUNT} dice, ${MAX_DICE_SIDES} sides.`);
    return;
  }

  await message.reply(formatDiceRoll(roll));
}

module.exports = {
  handleDiceMessage,
  handleDiceRoll,
  rollDice,
};
