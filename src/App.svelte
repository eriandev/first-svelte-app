<script>
	export let API, missingName, missingImg;
    
    let pokeName = 'POKEMON';
    let pokeImg = 'images/pokeball.png';

    function getData(stringToFind){

        return fetch(`${API}${stringToFind}`).then(res => res.json());
    }

    async function handleSubmit(event){

        const textValue = event.target.pokeName.value.trim().toLowerCase();
        try {
            const data = await getData(textValue);
            pokeName = data.name.toUpperCase();
            pokeImg = data.sprites.front_default;
        } 
        catch (e) {
            pokeName = missingName;
            pokeImg = missingImg;
        } 
        finally {
            document.getElementById('pokeForm').reset();
        }
    }
</script>

<div class="flex flex-wrap bg-gray-900 h-screen content-center text-center">
    <div class="w-full">
        <form id="pokeForm" on:submit|preventDefault={handleSubmit}>
            <span class="text-md font-bold text-white">{pokeName}</span>
            <img class="mx-auto" src={pokeImg} alt={pokeName}>
            <input id="pokeName" class="bg-gray-200 hover:bg-white focus:bg-white py-2 px-4 my-2 text-gray-700 leading-tight border border-transparent hover:border-gray-300 focus:border-gray-300 focus:outline-none focus:shadow-outline appearance-none rounded" type="text" placeholder="Nombre del pokemon" autocomplete="off" required>
            <button class="bg-blue-500 hover:bg-blue-400 py-2 px-4 text-white font-bold border-b-4 border-blue-700 hover:border-blue-500 focus:outline-none rounded">
                Buscar
            </button>
        </form>
    </div>
</div>
