var circuitBoard;
var currentTool = 0;
var savedMachines;
var activeTab = 'build';
var selectedMachine;
var simMode = false;
var machineIdCounter = 0;

const PIXELRATIO = Math.round(window.devicePixelRatio) || 1;

const IMGANT = (img => {img.src = 'assets/ant.png'; return img})(document.createElement('img'));
const CELLSIZE = 80;
const CELLRESOLUTION = CELLSIZE * PIXELRATIO;

// Initial Setup
window.addEventListener('load',function() {
	// Prevent context menus when right-clicking in the center box
	document.getElementById('center-box').addEventListener('contextmenu',function(e) {e.preventDefault()});
	
	// Pull elements from document now so we don't need to do it repeatedly later
	let circuitArea = document.getElementById('circuit-area');
	let clearButton = document.getElementById('control-button-clear');
	let loadButton = document.getElementById('control-button-load');
	let saveButton = document.getElementById('control-button-save');
	let fnameInput = document.getElementById('control-input-fname');
	let heightInput = document.getElementById('control-input-bheight');
	let widthInput = document.getElementById('control-input-bwidth');
	let simIntervalInput = document.getElementById('control-input-simInterval');
	let simInputInputs = [0,1,2,3].map((i) => {return document.getElementById('control-input-simInput'+i)});
	let machineListDisplay = document.getElementById('machine-list');
	let machineDetailsDisplay = {
		box: document.getElementById('machine-details-area'),
		heading: document.getElementById('machine-details-heading'),
		description: document.getElementById('machine-details-description'),
		editbutton: document.getElementById('machine-details-edit-button'),
		deletebutton: document.getElementById('machine-details-delete-button')
	};
	// Generate the circuit board object, which allows display and manipulation of a circuit
	circuitBoard = {
		table: document.getElementById('circuit-board'),
		// cells: [],
		canvases: [],
		data: new CircuitData(),
		pathDrawerSelection: undefined,
		simulation: undefined,
		simInterval: 500,
		simInputs: [0,0,0,0],
		simSteps: 1,
		simVar: undefined,
		get height() {return this.data.height;},
		get width() {return this.data.width;},
		set height(h)
		{
			let origheight = this.height;
			this.data.height = h;
			switch(Math.sign(origheight-h))
			{
				case 1:
					// downsizing
					
					// delete rows
					this.canvases = this.canvases.slice(0,h);
					
					while(this.table.rows.length>h)
					{
						this.table.deleteRow(-1);
					}
					
					// erase tunnels
					// if(this.height) for(let x = 0; x < this.width; x++)
					// {
						// this.cells[h-1][x].down = false;
						// if(this.cells[h-1][x].antDir == 1) this.cells[h-1][x].ant = false;
						// this.cells[h-1][x].draw();
					// }
					break;
				case -1:
					// upsizing
					
					// erase tunnels
					// if(this.height) for(let x = 0; x < this.width; x++)
					// {
						// this.cells[this.height-1][x].down = false;
						// if(this.cells[this.height-1][x].antDir == 1) this.cells[h-1][x].ant = false;
						// this.cells[this.height-1][x].draw();
					// }
					
					// add rows
					for(let y = origheight; y < h; y++)
					{
						let canvasRow = [];
						let row = document.createElement('tr');
						for(let x = 0; x < this.width; x++)
						{
							let cell = document.createElement('td');
							let canv = this.generateCanvas(y,x);
							canvasRow.push(canv);
							cell.appendChild(canv);
							row.appendChild(cell);
						}
						this.table.appendChild(row);
						this.canvases.push(canvasRow);
					}
			}
			this.drawCells();
		},
		set width(w)
		{
			let origwidth = this.width;
			this.data.width = w;
			switch(Math.sign(origwidth-w))
			{
				case 1:
					// downsizing
					
					// delete columns
					for(let y = 0; y < this.height; y++)
					{
						this.canvases[y] = this.canvases[y].slice(0,w);
						while(this.table.rows[y].cells.length>w)
						{
							this.table.rows[y].deleteCell(-1);
						}
					}
					
					// erase tunnels
					// if(this.width) for(let y = 0; y < this.height; y++)
					// {
						// this.cells[y][w-1].right = false;
						// if(this.cells[y][w-1].antDir == 2) this.cells[y][w-1].ant = false;
						// this.cells[y][w-1].draw();
					// }
					
					// set table width
					this.table.style.width = CELLSIZE*this.width+'px';
					break;
				case -1:
					// upsizing
					
					// erase tunnels
					// if(this.width) for(let y = 0; y < this.height; y++)
					// {
						// this.cells[y][this.width-1].right = false;
						// if(this.cells[y][this.width-1].antDir == 2) this.cells[y][w-1].ant = false;
						// this.cells[y][this.width-1].draw();
					// }
					
					// add columns
					for(let y = 0; y < this.height; y++)
					{
						for(let x = origwidth; x < w; x++)
						{
							let cell = document.createElement('td');
							let canv = this.generateCanvas(y,x);
							this.canvases[y].push(canv);
							cell.appendChild(canv);
							this.table.rows[y].appendChild(cell);
						}
					}
					
					// set table width
					this.table.style.width = CELLSIZE*this.width+'px';
			}
			this.drawCells();
		},
		// creates a canvas, styles it, and adds all the appropriate event listeners.
		generateCanvas: function(y,x){
			let canv = document.createElement('canvas');
			canv.width = CELLRESOLUTION;
			canv.height = CELLRESOLUTION;
			canv.style.width = CELLSIZE+'px';
			canv.style.height = CELLSIZE+'px';
			canv.draggable = false;
			
			let ctx = canv.getContext('2d');
			ctx.fillStyle = 'white';
			ctx.fillRect(0,0,CELLRESOLUTION,CELLRESOLUTION);
			
			
			canv.addEventListener('mousedown',(e) => {
				// Cancel this event if simulation is running.
				if(simMode) return;
				
				let cell = this.data.cells[y][x];
				let placeOrErase = (e.buttons>>1)%2 ? false : e.buttons%2 ? !e.shiftKey : undefined;
				switch(currentTool)
				{
					case 0: /* Draw Tool */
						this.pathDrawerSelection = [y,x];
						break;
					case 1: /* Ant Tool */
						// Set to false if right button is pressed and/or shift key is held, otherwise set to true if left button is pressed and else undefined
						if(placeOrErase && cell.connections.includes(true))
						{
							// left click is pressed
							console.log('ant press');
							if(cell.ant!=-1)
							{
								cell.ant = (cell.ant + 1) % 4;
							}
							else
							{
								cell.ant = 1;
							}
							
							// Adjust ant until sitting on a path connection
							while(!cell.connections[(cell.ant+2)%4])
							{
								cell.ant = (cell.ant + 1) % 4;
							}
						}
						else if(placeOrErase==false)
						{
							// right click is pressed
							cell.ant = -1;
						}
						this.drawCell(y,x);
						break;
					case 2: /* Vertical Tunnel */
						// TODO Rework tunnels to be properties of board and have at max 1 per board side
						if(placeOrErase != undefined)
						{
							if(y == 0)
							{
								cell.connections[1] = placeOrErase;
								this.drawCell(y,x);
							} else if (y == this.height-1)
							{
								cell.connections[3] = placeOrErase;
								this.drawCell(y,x);
							}
						}
						break;
					case 3: /* Horizontal Tunnel */
						if(placeOrErase != undefined)
						{
							if(x == 0)
							{
								cell.connections[2] = placeOrErase;
								this.drawCell(y,x);
							} else if (x == this.width-1)
							{
								cell.connections[0] = placeOrErase;
								this.drawCell(y,x);
							}
						}
						break;
					default:
						// Biscuits
				}
			});
			canv.addEventListener('mouseover',(e) => {
				// Cancel this event if simulation is running.
				if(simMode) return;
				
				let cell = this.data.cells[y][x];
				if(currentTool==0 && this.pathDrawerSelection != undefined)
				{
					// Set to false if right button is pressed and/or shift key is held, otherwise set to true if left button is pressed and else undefined
					let placeOrErase = (e.buttons>>1)%2 ? false : e.buttons%2 ? !e.shiftKey : undefined;
					let linkDir = circuitBoard.cellAdj(circuitBoard.pathDrawerSelection,[y,x]);
					if(linkDir != undefined && placeOrErase != undefined)
					{
						let prevCell = this.data.cells[this.pathDrawerSelection[0]][this.pathDrawerSelection[1]];
						prevCell.connections[linkDir] = placeOrErase;
						cell.connections[(linkDir+2)%4] = placeOrErase;
						
						// Erase ants if needed
						if(placeOrErase==false)
						{
							if(prevCell.ant!=-1 && (prevCell.ant+2)%4 == linkDir) prevCell.ant = -1;
							if(cell.ant!=-1 && cell.ant == linkDir) cell.ant = -1;
						}
						
						this.drawCell(y,x);
						this.drawCell(...this.pathDrawerSelection);
					}
					circuitBoard.pathDrawerSelection = [y,x];
				}
			});
			return canv;
		},
		drawCell: function(y,x){
			let cell = this.data.cells[y][x];
			
			// Get context
			let ctx = this.canvases[y][x].getContext('2d');
			// Convenience variable for half the cell size
			let m = CELLRESOLUTION/2;
			// Clear the canvas
			ctx.fillStyle = 'white';
			ctx.fillRect(0,0,CELLRESOLUTION,CELLRESOLUTION);
			
			// Setup parameters
			ctx.lineWidth = 5*PIXELRATIO;
			ctx.lineCap = 'round';
			ctx.fillStyle = 'gray';
			// Setup context for rotation
			ctx.save();
			ctx.translate(m,m);
			// Draw connections + tunnels
			for(let i = 0; i < 4; i++)
			{
				if(cell.connections[i])
				{
					ctx.beginPath();
					ctx.moveTo(0,0);
					ctx.lineTo(m,0);
					ctx.stroke();
					if((y==0&&i==1)||(y==this.height-1&&i==3)||(x==0&&i==2)||(x==this.width-1&&i==0))
					{
						ctx.beginPath();
						ctx.arc(m,0,10*PIXELRATIO,0,2*Math.PI);
						ctx.fill();
						ctx.stroke();
					}
				}
				ctx.rotate(-Math.PI/2);
			}
			// Draw ant
			let antval = simMode ? this.simulation.ants[y][x] : cell.ant;
			if(antval != -1)
			{
				ctx.rotate(-antval*Math.PI/2);
				ctx.drawImage(IMGANT,-30*PIXELRATIO,-17.5*PIXELRATIO,IMGANT.width/3*PIXELRATIO,IMGANT.height/3*PIXELRATIO);
			}
			ctx.restore();
		},
		// Draw every cell in a range
		drawCells: function(x1=0,y1=0,x2=this.width,y2=this.height) {
			for(let x = x1; x < x2; x++) for(let y = y1; y < y2; y++)
			{
				this.drawCell(y,x);
			}
		},
		cellAdj: function(c1,c2) {
			if(c2[0]==c1[0] && c2[1]==c1[1]+1) return 0;
			if(c2[0]==c1[0]-1 && c2[1]==c1[1]) return 1;
			if(c2[0]==c1[0] && c2[1]==c1[1]-1) return 2;
			if(c2[0]==c1[0]+1 && c2[1]==c1[1]) return 3;
			return undefined;
		},
		// Create a simulation object from data, turn on simulation mode and disable tool use.
		beginSimulation: function()
		{
			this.simulation = new Simulation(this.data,true);
			circuitArea.style.backgroundColor = 'silver';
			
			heightInput.disabled						= true;
			widthInput.disabled							= true;
			saveButton.disabled							= true;
			loadButton.disabled							= true;
			clearButton.disabled						= true;
			fnameInput.disabled							= true;
			machineDetailsDisplay.editbutton.disabled	= true;
			
			this.playSimulation();
		},
		// Sets simulation to run on an interval
		playSimulation: function()
		{
			simMode = 1;
			this.simVar = window.setInterval(()=>{this.simulate();},this.simInterval);
		},
		// Stops simulation running but does not end simulation mode.
		pauseSimulation: function()
		{
			simMode = 2;
			window.clearInterval(this.simVar);
		},
		// Restore tool use and turn off simulation mode.
		endSimulation: function()
		{
			this.pauseSimulation();
			
			simMode = false;
			circuitArea.style.backgroundColor = 'white';
			circuitBoard.drawCells();
			
			
			heightInput.disabled						= false;
			widthInput.disabled							= false;
			saveButton.disabled							= false;
			loadButton.disabled							= false;
			clearButton.disabled						= false;
			fnameInput.disabled							= false;
			machineDetailsDisplay.editbutton.disabled	= false;
		},
		// Advances the circuitBoard by [steps] iterations of the simulation, then draws all cells that were modified
		simulate: function()
		{
			if(simMode)
			{
				for(let i = 0; i < this.simSteps; i++)
				{
					this.simulation.inputs = this.simInputs;
					this.simulation.simulate();
					this.simInputs.fill(0);
					simInputInputs.forEach((obj) => {obj.checked = false;});
				}
				this.drawFlagged();
			}
			
		},
		drawFlagged: function() {
			for(let x = 0; x < this.width; x++) for(let y = 0; y < this.height; y++)
			{
				if(this.simulation.drawFlags[y][x])
				{
					this.drawCell(y,x);
					this.simulation.drawFlags[y][x] = false;
				}
			}
		},
		loadData: function(data) {
			// resize board to fit data
			this.height = data.height;
			this.width = data.width;
			console.log(this.data);
			
			console.log(data);
			
			// clone data
			this.data = data.clone();
			console.log(this.data);
			
			// update visuals
			this.drawCells();
			updateSizeInputs();
		},
		clear: function() {
			for(let x = 0; x < this.width; x++) for(let y = 0; y < this.height; y++)
			{
				this.data.cells[y][x].connections = [0,0,0,0];
				this.data.cells[y][x].ant = -1;
			}
			this.drawCells();
		}
	};
	circuitBoard.height = 5;
	circuitBoard.width = 6;
	
	savedMachines = [];
	
	let tabButtons = document.getElementsByClassName('tab-button');
	for(let i=0; i<tabButtons.length; i++)
	{
		tabButtons[i].addEventListener('mousedown', function() {
			if(this.dataset.tabname!=undefined && this.dataset.tabname!=activeTab)
			{
				changeTab(this.dataset.tabname);
			}
		});
	}
	
	function changeTab(tabname)
	{
		for(let j=0; j<tabButtons.length; j++) if(tabButtons[j].dataset.tabname==activeTab)
		{
			tabButtons[j].classList.remove('tab-active');
			break;
		}
		document.getElementById(activeTab+'-view').style.display = 'none';
		activeTab = tabname;
		for(let j=0; j<tabButtons.length; j++) if(tabButtons[j].dataset.tabname==activeTab)
		{
			tabButtons[j].classList.add('tab-active');
			break;
		}
		document.getElementById(activeTab+'-view').style.display = 'flex';
	}
	
	
	let relPathDrawer = function () {circuitBoard.pathDrawerSelection = undefined};
	circuitArea.addEventListener('mouseup',relPathDrawer);
	circuitArea.addEventListener('mouseleave',relPathDrawer);
	
	let toolButtons = document.getElementsByClassName('tool-button');
	for(let i=0; i<toolButtons.length; i++)
	{
		toolButtons[i].addEventListener('mousedown', function() {
			if(this.dataset.toolid!=undefined)
			{
				for(let j=0; j<toolButtons.length; j++) if(toolButtons[j].dataset.toolid==currentTool) {
					toolButtons[j].classList.remove('tool-active');
					break;
				}
				currentTool = Number(this.dataset.toolid);
				this.classList.add('tool-active');
			}
		});
	}
	
	let simulationStartButton = document.getElementById('control-button-simulation-start');
	simulationStartButton.addEventListener('mousedown', function() {
		switch(simMode)
		{
			case false:
				// circuitBoard.simInputs = [0,0,1,0];
				circuitBoard.beginSimulation();
				this.innerText = 'Pause';
				break;
			case 1:
				circuitBoard.pauseSimulation();
				this.innerText = 'Play';
				break;
			case 2:
				circuitBoard.playSimulation();
				this.innerText = 'Pause';
		}
	});
	
	let simulationEndButton = document.getElementById('control-button-simulation-end');
	simulationEndButton.addEventListener('mousedown', function() {
		if(simMode)
		{
			circuitBoard.endSimulation();
			simulationStartButton.innerText = 'Start';
		}
	});
	
	simIntervalInput.value = circuitBoard.simInterval;
	simIntervalInput.addEventListener('change',function() {
		inputNumberFix(this);
		circuitBoard.simInterval = this.value;
		// refresh the simulation interval if currently running
		if(simMode == 1)
		{
			circuitBoard.pauseSimulation();
			circuitBoard.playSimulation();
		}
	});
	
	simInputInputs.forEach((obj,i) => obj.addEventListener('change',function() {
		circuitBoard.simInputs[i] = this.checked;
	}));
	
	fnameInput.addEventListener('change', function() {
		this.value = this.value.trim();
	});
	
	saveButton.addEventListener('mousedown', function() {
		let fname = fnameInput.value.length ? fnameInput.value : fnameInput.placeholder;
		registerMachine(fname,circuitBoard.data.clone());
	});
	
	loadButton.addEventListener('mousedown', function() {
		let fname = fnameInput.value.length ? fnameInput.value : fnameInput.placeholder;
		let entry = findMachineByName(fname);
		if(entry == undefined) alert("No saved machine with this name could be found.");
		else
		{
			circuitBoard.loadData(entry.data);
		}
	});
	
	clearButton.addEventListener('mousedown', function() {circuitBoard.clear();});
	
	heightInput.addEventListener('change', function() {
		inputNumberFix(this);
		circuitBoard.height = this.value;
	});
	
	widthInput.addEventListener('change', function() {
		inputNumberFix(this);
		circuitBoard.width = this.value;
	});
	
	updateSizeInputs();
	
	/**
	 * Takes a CircuitData object as input, generates a display element for it, and adds the pair to savedMachines,
	 * overwriting any previous machine of the same name.
	 */
	function registerMachine(name,data)
	{
		let entry = findMachineByName(name);
		if(entry==undefined)
		{
			let display = document.createElement('button');
			// display.classList.add('machine-list-item');
			display.innerText = name;
			display.dataset.fname = name;
			entry = {
				name: name,
				id: machineIdCounter++,
				data: data,
				display: display,
				desc: ''
			};
			display.addEventListener('mousedown', function()
			{
				// Update machine-details-area with data
				let prevSelected = findMachineByName(selectedMachine);
				if(prevSelected!=undefined)
				{
					prevSelected.display.classList.remove('machine-details-active');
				}
				this.classList.add('machine-details-active');
				
				selectedMachine = entry.name;
				// TODO update details pane to reflect new selected machine
				machineDetailsDisplay.box.hidden = false;
				machineDetailsDisplay.heading.innerText = entry.name;
				machineDetailsDisplay.description.value = entry.desc;
			});
			machineListDisplay.appendChild(display);
			
			// TEMP sorts display order of machines alphabetically as they are added
			sortMachineDisplay((a,b)=>a.innerText.localeCompare(b.innerText));
			savedMachines.push(entry);
		}
		else
		{
			entry.data = data;
		}
	}
	
	machineDetailsDisplay.description.addEventListener('change', function() {
		findMachineByName(selectedMachine).desc = this.value;
	});
	
	machineDetailsDisplay.editbutton.addEventListener('mouseup', function() {
		changeTab('build');
		circuitBoard.loadData(findMachineByName(selectedMachine).data);
		fnameInput.value = selectedMachine;
	});
	
	machineDetailsDisplay.deletebutton.addEventListener('mouseup', function() {
		// TODO Add confirmation dialogue before deleting a machine
		// Remove the machine's data from savedMachines and destroys its display element
		savedMachines.splice(findMachineIndexByName(selectedMachine),1)[0].display.remove();
		selectedMachine = undefined;
		machineDetailsDisplay.box.hidden = true;
	});
	
	function sortMachineDisplay(compareFunction)
	{
		[...machineListDisplay.children].sort(compareFunction).forEach(node=>machineListDisplay.appendChild(node));
	}
	
	function updateSizeInputs()
	{
		heightInput.value = circuitBoard.height;
		widthInput.value = circuitBoard.width;
	}
	// testing only
	//circuitBoard.loadData(starterLayout);
});

function dirToCoord(dir)
{
	switch(dir)
	{
		case 0: return [0,1];
		case 1: return [-1,0];
		case 2: return [0,-1];
		case 3: return [1,0];
		default: return undefined;
	}
}

function inputNumberFix(obj)
{
	obj.value = Math.min(Math.max(Math.trunc(obj.value),obj.min),obj.max)
}

function findMachineById(id)
{
	return savedMachines.find(item => item.id==id);
}

function findMachineByName(name)
{
	return savedMachines.find(item => item.name==name);
}

function findMachineIndexByName(name)
{
	return savedMachines.findIndex(item => item.name==name);
}

/**
 * Class for storing data about a circuit. This includes the cell connections, tunnels, ant positions, and nested
 * circuits.
 */
class CircuitData
{
	/**
	 * If y and x are specified, generates an empty circuit of those dimensions. Otherwise generates a 0x0 circuit.
	 */
	constructor (y,x)
	{
		if(y == undefined)
		{
			this.cells = [];
		}
		else
		{
			this.cells = new Array(y).fill(0).map(() => new Array(x).fill(0).map(() => ({
				connections: [0,0,0,0],
				circuit: -1,
				ant: -1
			})));
		}
	}
	
	/**
	 * Returns a deep copy of the object
	 */
	clone()
	{
		let o = new CircuitData();
		o.cells = this.cells.map(row => row.map(cell => ({
			connections: [...cell.connections],
			circuit: cell.circuit,
			ant: cell.ant
		})));
		return o;
	}
	
	get height() {return this.cells.length;}
	get width() {return this.cells.length ? this.cells[0].length : 0;}
	set height(h)
	{
		switch(Math.sign(this.height-h))
		{
			case 1:
				// downsizing
				
				// delete rows
				this.cells = this.cells.slice(0,h);
				
				// erase tunnels
				if(h) for(let x = 0; x < this.width; x++)
				{
					this.cells[h-1][x].connections[3] = 0;
					if(this.cells[h-1][x].ant == 1) this.cells[h-1][x].ant = -1;
				}
				break;
				
			case -1:
				// upsizing
				
				// erase tunnels
				if(this.height) for(let x = 0; x < this.width; x++)
				{
					this.cells[this.height-1][x].connections[3] = 0;
					if(this.cells[this.height-1][x].ant == 1) this.cells[this.height-1][x].ant = -1;
				}
				
				// add rows
				for(let y = this.height; y < h; y++)
				{
					this.cells.push(new Array(this.width).fill(0).map(() => ({
						connections: [0,0,0,0],
						circuit: -1,
						ant: -1
					})));
				}
		}
	}
	set width(w)
	{
		switch(Math.sign(this.width-w))
		{
			case 1:
				// downsizing
				
				// for each row
				for(let y = 0; y < this.height; y++)
				{
					// delete cells
					this.cells[y] = this.cells[y].slice(0,w);
					
					// erase tunnels
					this.cells[y][w-1].connections[0] = 0;
					if(this.cells[y][w-1].ant == 2) this.cells[y][w-1].ant = -1;
				}
				break;
				
			case -1:
				// upsizing
				
				// for each row, erase tunnels
				if(this.width) for(let y = 0; y < this.height; y++)
				{
					this.cells[y][this.width-1].connections[0] = 0;
					if(this.cells[y][this.width-1].ant == 2) this.cells[y][this.width-1].ant = -1;
				}
				// for each row
				let origwidth = this.width;
				for(let y = 0; y < this.height; y++)
				{
					// add cells
					for(let x = origwidth; x < w; x++)
					{
						this.cells[y].push({
							connections: [0,0,0,0],
							circuit: -1,
							ant: -1
						});
					}
				}
		}
	}
	
}

/**
 * Class for storing data about a circuit actively being simulated. Stores a reference to a CircuitData object,
 * current ant positions, flags for cells that need to be redrawn, and a time counter.
 */
class Simulation
{
	/**
	 * circuit is a reference to a CircuitData object, doDrawFlags is a boolean specifying whether this object should
	 * keep track of which cells need to be redrawn.
	 */
	constructor (circuit,doDrawFlags)
	{
		this.doDrawFlags = doDrawFlags==true;
		this.circuit = circuit;
		this.ants = circuit.cells.map(row => row.map(cell => cell.ant));
		// Recursively create a new simulation object for every cell that contains a circuit.
		this.subSimulations = circuit.cells.map(row => row.map(cell => (
			cell.circuit==-1 ? undefined : new Simulation(findMachineById(savedMachines).data)
			)));
		this.age = 0;
		this.inputs = [0,0,0,0]; // Represents the incoming ants for the next step of simulation.
		this.height = this.circuit.height;
		this.width = this.circuit.width;
		if(this.doDrawFlags) this.drawFlags = new Array(this.height).fill(0).map(() => []);
	}
	
	/* Runs one step of simulation on this circuit, updating ant positions.
	 * Returns an array of 4 booleans corresponding to whether or not an ant exited at each of the 4 tunnels.
	 */
	simulate()
	{
		// Create a temporary array to store the outgoing ants in each direction for every tile on the circuit.
		let antSpread = new Array(this.height).fill(0).map(() => new Array(this.width).fill(0).map(() => [0,0,0,0]));
		
		// populate antSpread
		
		for(let x = 0; x < this.width; x++) for(let y = 0; y < this.height; y++)
		{
			// for each cell
			
			// TODO if cell contains a nested circuit, recursively call simulate on it
			
			
			// Handle spreading for normal tiles
			let ant = this.ants[y][x];
			let cell = this.circuit.cells[y][x];
			if(ant != -1)
			{
				// cell has an ant
				for(let i = 0; i < 4; i++)
				{
					// for each direction
					if(cell.connections[i] && i != (ant+2)%4)
					{
						// spread ant
						
						let [dy,dx] = dirToCoord(i);
						// console.log(`attempting spread from ${[y,x]} to ${[y+dy,x+dx]}`);
						
						antSpread[y][x][i] = 1;
						// TODO Add tunnel functionality
					}
				}
			}
		}
		
		// interpret results and update ants
		
		for(let x = 0; x < this.width; x++) for(let y = 0; y < this.height; y++)
		{
			
			// TODO Handle tiles with nested circuits
			
			// Handle normal tiles
			
			let oldAnt = this.ants[y][x];
			let antsIn = 0;
			let newAntDir = 0;
			
			// add incoming ants from tunnels
			if(this.inputs[0] && x==this.width-1 && this.circuit.cells[y][x].connections[0])
			{
				antsIn++;
				newAntDir = 2;
			}
			if(this.inputs[1] && y==0 && this.circuit.cells[y][x].connections[1])
			{
				antsIn++;
				newAntDir = 3;
			}
			if(this.inputs[2] && x==0 && this.circuit.cells[y][x].connections[2])
			{
				antsIn++;
				newAntDir = 0;
			}
			if(this.inputs[3] && y==this.height-1 && this.circuit.cells[y][x].connections[3])
			{
				antsIn++;
				newAntDir = 1;
			}
			
			// Calculate new ant
			for(let i = 0; i < 4; i++)
			{
				// for each direction
				
				let [dy,dx] = dirToCoord(i);
				
				// ignore directions that go off the table
				if(y+dy < 0 || y+dy >= this.height || x+dx < 0 || x+dx >= this.width) continue;
				
				if(antSpread[y+dy][x+dx][(i+2)%4] && !antSpread[y][x][i])
				{
					// console.log(`recieving spread from ${[y+dy,x+dx]} to ${[y,x]}`);
					antsIn++;
					newAntDir = (i+2)%4;
				}
			}
			
			// If exactly one ant has spread into this space, add an ant next step
			if(antsIn == 1)
			{
				this.ants[y][x] = newAntDir;
			}
			else
			{
				this.ants[y][x] = -1;
			}
			// Flag cell for redrawing if old ant is not equal to new ant
			if(this.doDrawFlags && this.ants[y][x] != oldAnt) this.drawFlags[y][x] = true;
			
		}
		
		this.age++;
		this.inputs.fill(0);
		// TODO return the outputs of tunnels
		let outputs = [
			antSpread.map(row => row[this.width-1][0]),
			antSpread[0].map(cell => cell[1]),
			antSpread.map(row => row[0][2]),
			antSpread[this.height-1].map(cell => cell[3])
		].map(a => a.reduce((a,b) => (a^b), 0));
		if(outputs.includes(1)) console.log(outputs);
		return outputs;
	}
}

// And gate for test demonstration
//let starterLayout={"cells":[[{"connections":[false,true,false,true],"ant":true,"antDir":3},{"connections":[true,false,false,true],"ant":false},{"connections":[true,false,true,false],"ant":false},{"connections":[true,false,true,false],"ant":false},{"connections":[true,false,true,false],"ant":false},{"connections":[false,false,true,true],"ant":false}],[{"connections":[true,true,false,false],"ant":false},{"connections":[false,true,true,true],"ant":false},{"connections":[true,false,false,true],"ant":false},{"connections":[true,false,true,true],"ant":false},{"connections":[false,false,true,true],"ant":false},{"connections":[false,true,false,true],"ant":false}],[{"connections":[true,false,false,true],"ant":false},{"connections":[true,true,true,true],"ant":false},{"connections":[true,true,true,true],"ant":false},{"connections":[false,true,true,false],"ant":false},{"connections":[true,true,false,true],"ant":false},{"connections":[false,true,true,true],"ant":false}],[{"connections":[true,true,false,true],"ant":false},{"connections":[false,true,true,false],"ant":false},{"connections":[true,true,false,false],"ant":false},{"connections":[true,false,true,false],"ant":false},{"connections":[false,true,true,false],"ant":false},{"connections":[false,true,false,true],"ant":false}],[{"connections":[false,true,true,false],"ant":true,"antDir":0},{"connections":[false,false,false,false],"ant":false},{"connections":[false,false,false,false],"ant":false},{"connections":[false,false,false,false],"ant":false},{"connections":[false,false,false,false],"ant":false},{"connections":[false,true,false,true],"ant":false}]]};