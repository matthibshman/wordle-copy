<script>
  import { getWordOfTheDay } from './wordGenerator';
  import { gameWon, gameLost, checkResult } from './gameRules';
  import { checkInput } from './validator';

	export let name;
  let guesses = [];
  $: input = '';

  const word = getWordOfTheDay(5);

  const play = () => {
    input = input.toLowerCase()
    if (checkInput(input, guesses) && !gameWon(guesses, word)) {
      // guess = input;
      guesses = [...guesses, input];
      input = '';
    }  
  }

</script>

<main>
	<h1>Hello {name}!</h1>
  <input bind:value={input} disabled={gameWon(guesses, word)}>
	<!-- <p>Guess {guess}</p> -->
  <p>Guesses remaining: {6 - guesses.length}</p>

  {#each guesses as guess}
    <div id="block_container">
      {#each guess as char, i}
        <div id="block" style="--background-color: {checkResult(char, i, word)}">{char}</div>
      {/each}
    </div>
  {/each}

  <!-- <p>Word {word}</p> -->

  <button on:click={play} disabled={gameWon(guesses, word)}>
    Enter
  </button>

  <h1 hidden={!gameLost(guesses, word)}>The word is: {word.toLowerCase()}</h1>
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: rgb(0, 153, 255);
		/* text-transform: uppercase; */
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}

  #block_container {
      padding: 15px;
  }

  #block {
    display:inline;
    background-color: var(--background-color, white);
    width: 30px;
    border: 2px solid black;
    padding: 5px;
    margin: 2px;
  }
</style>