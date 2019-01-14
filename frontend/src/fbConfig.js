import firebase from 'firebase/app'
import 'firebase/firestore'
var fireconfig = {
    apiKey: "AIzaSyDZGCNdaw3_sINmgnZSSTf201MN-QnCOV4",
      authDomain: "sbhacks5.firebaseapp.com",
      databaseURL: "https://sbhacks5.firebaseio.com",
      projectId: "sbhacks5",
      storageBucket: "sbhacks5.appspot.com",
      messagingSenderId: "954324753015"
  };
  firebase.initializeApp(fireconfig);
export  const fire = firebase.firestore();


export default firebase