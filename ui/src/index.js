import React from 'react';
import ReactDOM from 'react-dom';
import Root from './root/root';
import store, { history } from './data/state/store';
import firebase from 'firebase/app'
import firebaseConfig from './firebaseConfig';

//firebase.initializeApp(firebaseConfig);   Commented out because I could not figure out how to get it working with Demo page

ReactDOM.render(
  <React.StrictMode>
    <Root store={store} history={history} />
  </React.StrictMode>,
  document.getElementById('root')
);