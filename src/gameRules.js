
const gameWon = (guesses, word) =>
  guesses && guesses[guesses.length - 1] == word;

const gameLost = (guesses, word) =>
  guesses.length >= 6 && guesses[guesses.length - 1] != word;

const checkResult = (char, index, answer) => {
  let result = 'X';
  if (char == answer[index]) {
    result = char;
  } else if (answer.includes(char)) {
    result = 'O';
  }

  return colorMap(result);
};

const colorMap = (char) => {
  if (char == 'X') {
    return 'white';
  }

  if (char == 'O') {
    return 'lightyellow';
  }

  return 'lightgreen';
};

export { gameWon, gameLost, checkResult };