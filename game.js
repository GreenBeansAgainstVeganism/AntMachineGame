var circuitBoard;
var currentTool = 0;
const CELLSIZE = 80;

// Initial Setup
window.addEventListener('load',function() {
	// Prevent context menus when right-clicking in the build view
	document.getElementById('build-view').addEventListener('contextmenu',function(e) {e.preventDefault()});
	// Generate a test circuit board
	const [bheight,bwidth] = [8,10];
	circuitBoard = {
		table: document.getElementById('circuit-board'),
		cells: new Array(bheight).fill(0).map(() => []),
		pathDrawerSelection: undefined,
		drawCells: function(x1=0,y1=0,x2=bwidth,y2=bheight) {
			for(let x = x1; x < x2; x++) for(let y = y1; y < y2; y++)
			{
				this.cells[y][x].draw();
			}
		},
		cellAdj: function(c1,c2) {
			if(c2[0]==c1[0] && c2[1]==c1[1]+1) return 0;
			if(c2[0]==c1[0]-1 && c2[1]==c1[1]) return 1;
			if(c2[0]==c1[0] && c2[1]==c1[1]-1) return 2;
			if(c2[0]==c1[0]+1 && c2[1]==c1[1]) return 3;
			return undefined;
		}
	};
	circuitBoard.table.style.width = CELLSIZE*bwidth+'px';
	
	// Generate the circuit cells
	for(let i=0; i<bheight; i++)
	{
		let row = document.createElement('tr');
		for(let j=0; j<bwidth; j++)
		{
			let cell = document.createElement('td');
			let canv = document.createElement('canvas');
			canv.width = CELLSIZE;
			canv.height = CELLSIZE;
			// let ctx = canv.getContext('2d');
			// ctx.fillStyle = '#ff0000';
			// ctx.fillRect(0,0,80,80);
			circuitBoard.cells[i][j] = new CircuitCell(canv,[i,j]);
			cell.appendChild(canv);
			row.appendChild(cell);
		}
		circuitBoard.table.appendChild(row);
	}
	
	let circuitArea = document.getElementById('circuit-area');
	
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
				currentTool = this.dataset.toolid;
				this.classList.add('tool-active');
			}
		});
	}
	// test display one way line component
	// circuitBoard.cells[0][0].right=true;
	// circuitBoard.cells[0][0].down=true;
	// circuitBoard.cells[0][1].left=true;
	// circuitBoard.cells[0][1].right=true;
	// circuitBoard.cells[0][1].down=true;
	// circuitBoard.cells[0][2].left=true;
	// circuitBoard.cells[0][2].down=true;
	// circuitBoard.cells[1][0].left=true;
	// circuitBoard.cells[1][0].up=true;
	// circuitBoard.cells[1][0].down=true;
	// circuitBoard.cells[1][1].up=true;
	// circuitBoard.cells[1][1].right=true;
	// circuitBoard.cells[1][2].left=true;
	// circuitBoard.cells[1][2].up=true;
	// circuitBoard.cells[1][2].right=true;
	// circuitBoard.cells[1][2].down=true;
	// circuitBoard.cells[2][0].up=true;
	// circuitBoard.cells[2][0].right=true;
	// circuitBoard.cells[2][1].left=true;
	// circuitBoard.cells[2][1].right=true;
	// circuitBoard.cells[2][2].left=true;
	// circuitBoard.cells[2][2].up=true;
	circuitBoard.drawCells(0,0,3,3);
});

/**
 * A single cell in the circuit board. Contains information about connections, ants, biscuits,
 * as well as methods for drawing.
 */
class CircuitCell {
	constructor(canvas, coord, connections = [false,false,false,false])
	{
		this.canvas = canvas;
		this.connections = connections;
		this.coord = coord;
		
		// Add interaction with cell
		this.canvas.addEventListener('mousedown',() => {
			circuitBoard.pathDrawerSelection = this.coord;
		});
		this.canvas.addEventListener('mouseover',(e) => {
			if(circuitBoard.pathDrawerSelection != undefined)
			{
				// Set to false if right button is pressed and/or shift key is held, otherwise set to true if left button is pressed and else undefined
				let placeOrErase = (e.buttons>>1)%2 ? false : e.buttons%2 ? !e.shiftKey : undefined;
				let linkDir = circuitBoard.cellAdj(circuitBoard.pathDrawerSelection,this.coord);
				if(linkDir != undefined && placeOrErase != undefined)
				{
					let prevCell = circuitBoard.cells[circuitBoard.pathDrawerSelection[0]][circuitBoard.pathDrawerSelection[1]]
					prevCell.connections[linkDir] = placeOrErase;
					prevCell.draw();
					this.connections[(linkDir+2)%4] = placeOrErase;
					this.draw();
				}
				circuitBoard.pathDrawerSelection = this.coord;
			}
		});
		
		
	}
	draw()
	{
		let ctx = this.canvas.getContext('2d');
		let m = CELLSIZE/2;
		ctx.clearRect(0,0,CELLSIZE,CELLSIZE);
		
		// ctx.strokeStyle = '#000000';
		ctx.lineWidth = 5;
		ctx.lineCap = 'round';
		ctx.beginPath();
		[[CELLSIZE,m],[m,0],[0,m],[m,CELLSIZE]].forEach((coord,dir) => {
			if(this.connections[dir])
			{
				ctx.moveTo(m,m);
				ctx.lineTo(...coord);
			}
		});
		ctx.stroke();
	}
	get right() {return this.connections[0]}
	set right(b) {this.connections[0]=b}
	get up() {return this.connections[1]}
	set up(b) {this.connections[1]=b}
	get left() {return this.connections[2]}
	set left(b) {this.connections[2]=b}
	get down() {return this.connections[3]}
	set down(b) {this.connections[3]=b}
};