import randomWords from 'random-words';

const getWordOfTheDay = (wordLength) => {
  let word = randomWords();
  return word.length == wordLength ? word : getWordOfTheDay(wordLength);
};

export { getWordOfTheDay };
