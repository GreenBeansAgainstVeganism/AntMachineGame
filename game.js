
window.addEventListener('load',function() {
	console.log('here');
	let circuitBoard = document.getElementById('circuit-board');
	const [bwidth,bheight] = [10,8];
	circuitBoard.style.width = 80*bwidth+'px';
	for(let i=0; i<bheight; i++)
	{
		let row = document.createElement('tr');
		for(let j=0; j<bwidth; j++)
		{
			let cell = document.createElement('td');
			row.appendChild(cell);
		}
		circuitBoard.appendChild(row);
	}
});