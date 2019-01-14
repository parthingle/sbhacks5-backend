'use strict';
const firebase = require("firebase");
// Required for side-effects
require("firebase/firestore");
const twilio = require('twilio');

const VoiceResponse = twilio.twiml.VoiceResponse;

const projectId = process.env.GCLOUD_PROJECT;
const region = 'us-central1';

var fireconfig = {
  apiKey: "AIzaSyDZGCNdaw3_sINmgnZSSTf201MN-QnCOV4",
    authDomain: "sbhacks5.firebaseapp.com",
    databaseURL: "https://sbhacks5.firebaseio.com",
    projectId: "sbhacks5",
    storageBucket: "sbhacks5.appspot.com",
    messagingSenderId: "954324753015"
};
firebase.initializeApp(fireconfig);
var fire = firebase.firestore();

// Disable deprecated features
fire.settings({
  timestampsInSnapshots: true
});

const config = {
    "RESULTS_BUCKET": "sbhacks5bucket",
    "TWILIO_AUTH_TOKEN": "ff4371b03c98b09507963006d29107d3"
}
exports.handleCall = (req, res) => {
  if (!isValidRequest(req, res, 'handleCall')) {
    return;
  }

  const recordingStatusCallbackUrl = `https://${region}-${projectId}.cloudfunctions.net/getRecording`;

  // Prepare a response to the voice call
  const response = new VoiceResponse();

  // Prompt the user to leave a message
  response.say('At Yerba Mates, we care about your mental health. Please leave a message after the beep.');

  console.log('Recording message.');

  // Record the user's message
  response.record({
    // Limit the recording to 60 seconds
    maxLength: 600,
    // Give Twilio the deployed url of the other function for when the recorded
    // audio is available
    recordingStatusCallback: recordingStatusCallbackUrl
  });

  // End the call
  response.hangup();

  // Send the response
  res
    .status(200)
    .type('text/xml')
    .send(response.toString())
    .end();
};

function isValidRequest (req, res, pathname) {
    let isValid = true;
  
    // Only validate that requests came from Twilio when the function has been
    // deployed to production.
    if (process.env.NODE_ENV === 'production') {
      isValid = twilio.validateExpressRequest(req, config.TWILIO_AUTH_TOKEN, {
        url: `https://${region}-${projectId}.cloudfunctions.net/${pathname}`
      });
    }
  
    // Halt early if the request was not sent from Twilio
    if (!isValid) {
      res
        .type('text/plain')
        .status(403)
        .send('Twilio Request Validation Failed.')
        .end();
    }
  
    return isValid;
  }

  exports.getRecording = (req, res) => {
    if (!isValidRequest(req, res, 'getRecording')) {
      return;
    }
  
    const got = require('got');
    const path = require('path');
    const {Storage} = require('@google-cloud/storage');
    const storage = new Storage();
    
    const filename = `recordings/${path.parse(req.body.RecordingUrl).name}/audio.wav`;
    const file = storage
      .bucket(config.RESULTS_BUCKET)
      .file(filename);
  
    console.log(`Saving recording to: ${filename}`);
  
    got.stream(req.body.RecordingUrl)
      .pipe(file.createWriteStream({
        metadata: {
          contentType: 'audio/x-wav'
        }
      }))
      .on('error', (err) => {
        console.error(err);
        res
          .status(500)
          .send(err)
          .end();
      })
      .on('finish', () => {
        res
          .status(200)
          .end();
      });
  };

  exports.analyzeRecording = async (event) => {

    const object = event;
    console.log(object);
    if (!/^recordings\/\S+\/audio\.wav$/.test(object.name)) {
      // Ignore changes to non-audio files
      console.log('.wav file not found')
      return true;
    }
  
    console.log(`Analyzing gs://${object.bucket}/${object.name}`);
  
    // Import the Google Cloud client libraries
    const language = require('@google-cloud/language').v1beta2;
    const speech = require('@google-cloud/speech');
    
    const {Storage} = require('@google-cloud/storage');
    const storage = new Storage();


    const nlclient = new language.LanguageServiceClient();
    const spclient = new speech.SpeechClient();
    const bucket = storage.bucket(object.bucket);
    const dir = require('path').parse(object.name).dir;
  
    // Configure audio settings for Twilio voice recordings
    const audioConfig = {
      sampleRateHertz: 8000,
      encoding: 'LINEAR16',
      languageCode: 'en-US'
    };
  
    const audioPath = {
      uri: `gs://${object.bucket}/${object.name}`
    };
  
    const audioRequest = {
      audio: audioPath,
      config: audioConfig,
    };
    const data = await spclient.recognize(audioRequest);
    const sresponse = await data[0];
    const transcription = await sresponse.results.map(result => result.alternatives[0].transcript).join('\n');
    // console.log(typeof transcription);
    // console.log(transcription);
    // console.log('\nTest String\n');
    const splitlist = transcription.split('.');
    // console.log(typeof splitlist);
    // console.log(splitlist);
    var testarr = [];

    for(var i = 0; i < splitlist.length; i++){
        if (splitlist[i] != ''){
            var val = await nlclient.analyzeSentiment({document: {content:`${splitlist[i]}`, type: 'PLAIN_TEXT'}});
            testarr.push(val);
        }
    }
    var jsonout = '{\n\
      \"id\": \"' + `${dir}` + "\", \"data\": [\n "
    for(var i = 0; i < testarr.length; i++){
        jsonout += JSON.stringify(testarr[i][0].documentSentiment, null, 1); 
        jsonout += ',\n';
    }
    jsonout = jsonout.substring(0, jsonout.length-2)
    jsonout += '\n]\n}';

    // console.log("transform...");
    // console.log(typeof testarr)
    // console.log(testarr)
    const filename = `${dir}/analysis.json`;
    console.log(`Saving gs://${object.bucket}/${filename}`);
    fire.collection("analyses").add(JSON.parse(jsonout)).then(()=>{console.log('posted')}).catch((err) => {console.error(err)})

    return bucket
        .file("analysis.json")
        .save(jsonout)
    // return bucket
    //     .file(filename)
    //     .save(JSON.stringify(responses[0].documentSentiment, null, 1));
};