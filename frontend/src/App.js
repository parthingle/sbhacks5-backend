import React, { Component } from 'react';
import './App.css';
import Layout from './components/layout'
import Logo from './components/logo'
import Graph from './components/graph'
import firebase, {fire} from './fbConfig'


const projectId = "sbhacks5";
var graphs;
class App extends Component {
  constructor(props){
    super(props);
    this.state = {
      data: []
    }
  }
  onLoad = (e) => {
    var fdata = []
    e.preventDefault();

    fire.collection('analyses').get().then((snapshots) => 
    snapshots.docs.forEach(doc => {

      fdata.push(doc.data())
    })
    
    ).then(()=> {
      
      this.setState({
        data : fdata
      })
      graphs = this.state.data.map((d) => 
      <div>
        <Graph data={d}/>
        <br/>
      </div>
    )
      // console.log(this.state)
    })
    
  }
  render() {
    return (
      <div className="App">
      <h1>Heading</h1>
          <Logo/>
          <button onClick={this.onLoad}>Load Data</button>
          <div>{graphs}</div>
      </div>
    );
  }
}

export default App;
