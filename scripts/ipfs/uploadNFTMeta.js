const { create } = require("ipfs-http-client");

const ipfs = create("https://ipfs.infura.io:5001");

async function run() {
  const wood = {
    path: '/',
    content: JSON.stringify({
      name: "wood",
      description: "wood",
      image: "https://gateway.ipfs.io/ipfs/QmWhphWPzPPBnbKCLwVfJe3E8GwChXS7Wo8ytShgBVwCHT",
    })
  };

  const stone = {
    path: '/',
    content: JSON.stringify({
      name: "stone",
      description: "stone",
      image: "https://gateway.ipfs.io/ipfs/QmTjVBXqgZWY41mpmeD583YAiSMhrESMyhS8sVegduresb",
    })
  };

  const iron = {
    path: '/',
    content: JSON.stringify({
      name: "iron",
      description: "iron",
      image: "https://gateway.ipfs.io/ipfs/QmUCp61aSQZjvfnDGyuAkjoRDaZG85KbGs5FYQtnpc5BPg",
    })
  };

  const shortSword = {
    path: '/',
    content: JSON.stringify({
      name: "short sword",
      description: "short sword",
      image: "https://gateway.ipfs.io/ipfs/QmeW129Griw35u2zPvizQ1cG6GkdznvWD2nkE2UQwpynpv",
    })
  };

  const items = [stone, iron, shortSword];
  for(let i = 0; i < items.length; i++){
    console.log(items[i].content);
    const result = await ipfs.add(items[i]);
    console.log(result);
  }
}

run();