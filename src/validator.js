import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'https://od-api.oxforddictionaries.com:443/api/v2/lemmas/en-us/',
  timeout: 5000,
  headers: {
    app_id: '687c2edd',
    app_key: '1116af4f33575d46bd0e44d88405e46f',
    Accept: 'application/json',
  },
});

const checkInput = (input, guesses) =>
  guesses.length < 6 &&
  input.length == 5 &&
  /^[a-zA-Z]+$/.test(input) &&
  validWord(input);

const validWord = async (word) => {
  const word_id = 'fkdjs';

  // const response = await axiosInstance.get(word_id.toLowerCase());

  // console.log(response);

  return true;
};

export { checkInput };
