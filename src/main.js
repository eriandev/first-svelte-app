import App from './App.svelte';

const API = 'https://pokeapi.co/api/v2/pokemon/';
const missingName = 'MissingNa';
const missingImg = 'images/missingno.png';

const app = new App({
    target: document.body,
    props: {
        API,
        missingName,
        missingImg,
    }
});

export default app;
