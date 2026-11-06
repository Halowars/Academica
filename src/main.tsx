import React from 'react';
import {createRoot} from 'react-dom/client';
import Workspace from './workspace';
import {useAccount} from './lib/firebase';
import './globals.css';
import './refinements.css';
import './academic.css';
import './workspace-updates.css';
function App(){const account=useAccount();return <Workspace key={account.user?.id||'device'} account={account}/>;}
createRoot(document.getElementById('root')!).render(<App/>);
