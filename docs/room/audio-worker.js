import {createMusic,createRain} from './audio-score.js';
// Transfer original PCM; this worker never creates an audio context or plays sound.
try{const music=createMusic(),rain=createRain();self.postMessage({music,rain},[...music.channels.map(channel=>channel.buffer),rain.buffer]);}catch(error){self.postMessage({error:error.message});}
