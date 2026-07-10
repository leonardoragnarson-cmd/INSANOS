/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBgw-KojD27fVZDK7-qUoYk4fFxNHN72E0",
  authDomain: "gen-lang-client-0406630236.firebaseapp.com",
  projectId: "gen-lang-client-0406630236",
  storageBucket: "gen-lang-client-0406630236.firebasestorage.app",
  messagingSenderId: "995237030066",
  appId: "1:995237030066:web:8f5443675cbc17fa2501ab"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with the custom databaseId from configuration
export const db = initializeFirestore(app, {}, "ai-studio-ba83e9a8-fc8a-4076-a857-d1a1e83deb69");
export const auth = getAuth(app);
