// debug mode active
const DEBUG = true;
// root node of tree
var masterNode;
// should the centre mark (crosshairs) be drawn?
var doDrawCentreMark = false;
// element currently selected for editing
var selectedElement;
// element currently copied - static snapshot of element
var copiedElement;
//------------------------------------------------
// DEFAULT STYLES/TEXTS
// default text for text leaves - filled star
const DEFAULT_SYMBOL = 'black_star';
// default text for horizontal joins - logical AND
const DEFAULT_HCON = 'log_and';
// colour to hightlight items when clicked
const HIGHLIGHT_COLOUR = "#0000FF";

class Leaf{
	constructor(type){
		this.type = type;
		this.selected = false;
	}
	setSelected(bool){
		// set whether the element is currently selected
		this.selected = bool;
	}
	printCoords(){
		// debug function to print x/y values
		console.log(this.x);
		console.log(this.y);
	}
	printIdentifier(){
		// debug function to print name/helpful info
		if(this.text){
			console.log(this.text + ' clicked');
		}
		else{
			console.log(this.type + ' clicked');
		}
	}
	traceClick(ctx, clickX, clickY){
		// test if node clicked
		if(clickX <= this.x + this.getWidth(ctx)/2 && clickX >= this.x - this.getWidth(ctx)/2 && clickY <= this.y + this.getHeight(ctx)/2 && clickY >= this.y - this.getHeight(ctx)/2){
			// select element and return true
			selectElement(this);
			return true;
		}
		return false;
	}
	stage(){
		throw new Error('Call to abstract function');
	}
	repaint(){
		throw new Error('Call to abstract function');
	}
	getWidth(ctx){
		throw new Error('Call to abstract function');
	}
	getHeight(ctx){
		throw new Error('Call to abstract function');
	}
	getCopy(){
		throw new Error('Call to abstract function');
	}
}

class TextLeaf extends Leaf{
	constructor(text){
		super('leaf');
		this.text = text;
		// based on tested height of font for now - tricky problem
		this.height = 20;
		this.isTextLeaf = true;
	}
	getWidth(ctx){
		ctx.font = "20px arial";
		this.width = ctx.measureText(this.text).width;
		return this.width;
	}
	getHeight(ctx){
		return this.height;
	}
	stage(ctx, x, y){
		this.ctx = ctx;
		this.x = x;
		this.y = y;
		this.getWidth(ctx);
	}
	repaint(){
		if(this.ctx == null || this.x == null || this.y == null){
			console.log('Leaf painting error: null context, x, or y');
		}
		this.ctx.font = "20px arial";
		if(this.selected){
			var colour = this.ctx.fillStyle;
			this.ctx.fillStyle = HIGHLIGHT_COLOUR;
		}
		this.ctx.fillText(this.text, this.x - this.width/2, this.y);
		if(this.selected){
			this.ctx.fillStyle = colour;
		}
	}
  getLatex(){
		// If a latex alternative exists, use it, else use text
		if(this.latex){
			return this.latex;
		}
		else{
			return this.text;
		}
  }
	getCopy(){
		if(this.latex){
			return new UnicodeLeaf(this.text, this.latex);
		}
		else{
			return new TextLeaf(this.text);
		}
	}
}

class UnicodeLeaf extends TextLeaf{
  constructor(canvasText, latexCode){
    super(canvasText);
    this.latex = latexCode;
		this.isTextLeaf = true;
	}
}

class IncludedUnicodeLeaf extends UnicodeLeaf{
  constructor(key=DEFAULT_SYMBOL){
    super(getUnicodeChar(key), nameToUnicodeLatexMap.get(key));
  }
}

class HCon extends IncludedUnicodeLeaf{
  constructor(key=DEFAULT_HCON){
    super(key);
		this.key = key;
		this.isTextLeaf = false;
		this.isConnective = true;
		this.isHCon = true;
  }
	getCopy(){
		return new HCon(this.key);
	}
}

class VCon extends Leaf{
	constructor(vConType){
		super('vcon');
		this.isConnective = true;
		this.isVCon = true;
    this.vConType = vConType;
    this.left = '';
    this.right = '';
	}
  getLatexPrefix(){
    throw new Error('Call to abstract function');
  }
  getLatexLeft(){
    return this.left;
  }
  getLatexRight(){
    return this.right;
  }
	getCopy(){
		let copy = new VCon(this.vConType);
		copy.left = this.left;
		copy.right = this.right;
		return copy;
	}
}

class HLine extends VCon{
	constructor(lineType){
		super('hline');
		this.lineWidth = 0;
		this.lineType = lineType;

	}
	setLineWidth(lineWidth){
		this.lineWidth = lineWidth;
	}
	setLineType(lineType){
		this.lineType = lineType;
	}
	getWidth(){
    // TODO with left/right vals
		return this.lineWidth;
	}
	getHeight(){
    let height = 0;
    switch(this.lineType){
      case 'single_solid':
      case 'single_dotted':
        height = 8;
        break;
      case 'double_solid':
        height = 10;
        break;
      default:
        throw new Error('Cannot return height - line type not set');
    }
    return height;
		// TODO with var heights - check if heigher than fixed height
	}
	stage(ctx, x, y){
		if(this.lineWidth == null)	throw new Error('Line staged with invalid line width parameter');
		if(this.lineType == null) this.lineType = single_solid;
		this.ctx = ctx;
		this.x = x;
		this.y = y;
	}
	repaint(){
		if(this.selected){
			var colour = this.ctx.strokeStyle;
			this.ctx.strokeStyle = HIGHLIGHT_COLOUR;
		}
    this.ctx.beginPath();
    switch(this.lineType){
      case 'single_solid':
        this.ctx.moveTo(this.x - this.lineWidth/2, this.y + this.getHeight()/2);
        this.ctx.lineTo(this.x + this.lineWidth/2, this.y + this.getHeight()/2);
        break;
      case 'single_dotted':
        const dashLength = 3;
        for(let x = this.x - this.lineWidth/2; x < this.x + this.lineWidth/2; x += 2 * dashLength){
          this.ctx.moveTo(x, this.y + this.getHeight()/2);
          if(x + dashLength > this.x + this.lineWidth/2){
            this.ctx.lineTo(this.x + this.lineWidth/2, this.y + this.getHeight()/2);
            break;
          }
          else{
            this.ctx.lineTo(x + dashLength, this.y + this.getHeight()/2);
          }
        }
        break;
      case 'double_solid':
        this.ctx.moveTo(this.x - this.lineWidth/2, this.y + this.getHeight()/2 - 2);
        this.ctx.lineTo(this.x + this.lineWidth/2, this.y + this.getHeight()/2 - 2);
        this.ctx.moveTo(this.x - this.lineWidth/2, this.y + this.getHeight()/2 + 2);
        this.ctx.lineTo(this.x + this.lineWidth/2, this.y + this.getHeight()/2 + 2);
        break;
      default:
        throw new Error('Cannot draw line - line type not set');
    }
    this.ctx.stroke();
		if(this.selected){
			this.ctx.strokeStyle = colour;
		}
	}
  getLatexPrefix(){
    switch(this.lineType){
      case 'single_solid':
        return '\\odi';
      case 'double_solid':
        return '\\odI';
      case 'single_dotted':
        return '\\odo';
      default:
        throw new Error('Line type has no associated LaTeX prefix');
    }
  }
	getCopy(){
		let copy = new HLine(this.lineType);
		copy.left = this.left;
		copy.right = this.right;
		return copy;
	}
}

class Node extends Leaf{
	constructor(type){
		super(type);
		this.subs = [];
		this.connectives = [];
	}
	addNext(node){
		this.subs.push(node);
	}
	addPrev(node){
		this.subs.unshift(node);
	}
	setSelected(truth){
		this.selected = truth;
	}
	traceParent(child){
		// if child is directly in subs or connectives, return this as parent
		for(let item of this.subs){
			if(item === child){
				return this;
			}
		}
		for(let item of this.connectives){
			if(item === child){
				return this;
			}
		}
		// search deeper in subs
		for(let item of this.subs){
			if(item.type === 'vjoin' || item.type === 'hjoin'){
				let result = item.traceParent(child);
				if(result){
					return result;
				}
			}
		}
		return null;
	}
	traceReplace(oldNode, newNode){
		for(let item of this.subs){
			if(item === oldNode){
				this.subs.splice(this.subs.indexOf(oldNode), 1, newNode);
				return;
			}
		}
		for(let item of this.subs){
			if(item.type === 'vjoin' || item.type === 'hjoin'){
				item.traceReplace(oldNode, newNode);
			}
		}
	}
	traceRemove(node){
		for(let item of this.subs){
			if(item === node){
				// unsafe edge cases
				if(!node) return;
				if(this.subs.length === 0) return;
				// find element to remove
				let index = this.subs.indexOf(node);
				// remove element
				this.subs.splice(index, 1);
				// remove connective if necessary - remove from before element unless at front
				if(index === 0 && this.connectives.length !== 0){
					this.connectives.shift();
				}
				else if(index !== 0){
					this.connectives.splice(index - 1, 1);
				}
				if(this.subs.length === 0){
					if(masterNode === this){
						masterNode = new IncludedUnicodeLeaf();
					}
					else{
						masterNode.traceRemove(this);
					}
				}
				return;
			}
		}
		for(let item of this.subs){
			if(item.type === 'vjoin' || item.type === 'hjoin'){
				item.traceRemove(node);
			}
		}
	}
	traceClick(ctx, clickX, clickY){
		// test if node clicked
		if(clickX <= this.x + this.getWidth(ctx)/2 && clickX >= this.x - this.getWidth(ctx)/2 && clickY <= this.y + this.getHeight(ctx)/2 && clickY >= this.y - this.getHeight(ctx)/2){
			// select element then test if sub-elements selected
			selectElement(this);
			if(this.subs){
				for(let item of this.subs) {
					item.traceClick(ctx, clickX, clickY);
				}
			}
			if(this.connectives){
				for(let item of this.connectives){
					item.traceClick(ctx, clickX, clickY);
				}
			}
			return true;
		}
		return false;
	}
	stage(ctx, x, y){
		console.log('Warning: relying on generic node class function');
		this.subs.forEach(function(item, index, array) {
			item.stage(ctx, x, y);
		});
	}
	repaint(){
		console.log('Warning: relying on generic node class function');
		this.subs.forEach(function(item, index, array) {
			item.repaint();
		});
	}
	getCopy(){
		throw new Error('Call to abstract function');
	}
}

class hjoin extends Node{
	constructor(){
		super('hjoin');
		this.hspace = 5;
		this.connectives = [];
	}
	// add node left of the given node or at the very left if unspecified
	addLeft(node, ref){
		// if unspecified, add at very left, else find index to insert before
		let index = 0;
		if(ref != null){
			index = this.subs.indexOf(ref);
		}
		// if no other nodes, no connective needed, else add connective after
		if(this.subs.length !== 0) this.connectives.splice(index, 0, new HCon());
		this.subs.splice(index, 0, node);
	}
	// add node to right of the given node or at the very right if unspecified
	addRight(node, ref){
		// if unspecified, add at very right, else find index to insert after
		let index = this.subs.length - 1;
		if(ref != null){
			index = this.subs.indexOf(ref);
		}
		// if no other nodes, no connective needed, else add connective before
		if(this.subs.length !== 0) this.connectives.splice(index + 1, 0, new HCon());
		this.subs.splice(index + 1, 0, node);
	}
	getHeight(ctx){
		let maxHeight = 0;
		this.subs.forEach(function(item, index, array) {
			if(item.getHeight(ctx) > maxHeight) maxHeight = item.getHeight(ctx);
		});
		// if boxed, height heigher
		if(this.isBoxed){
			return maxHeight + 10;
		}
		return maxHeight;
	}
	getWidth(ctx){
		let totalWidth = 0;
		this.subs.forEach(function(item, index, array) {
			totalWidth += item.getWidth(ctx);
		});
		this.connectives.forEach(function(item, index, array){
			totalWidth += item.getWidth(ctx);
		});
		totalWidth += this.connectives.length * 2 * this.hspace;
		// if boxed, width wider
		if(this.isBoxed){
			return totalWidth + 10;
		}
		return totalWidth;
	}
	stage(ctx, x, y){
		this.ctx = ctx;
		this.x = x;
		this.y = y;
		let left = x - this.getWidth(ctx)/2;
		// if boxed, don't use full width - allow for box
		if(this.isBoxed){
			left = left + 5;
		}
		for (let item of this.subs) {
			item.stage(ctx, left + item.getWidth(ctx)/2, y);
			left += item.getWidth(ctx);
			left += this.hspace;
			if(this.subs.indexOf(item) < this.subs.length - 1){
				let con = this.connectives[this.subs.indexOf(item)];
				con.stage(ctx, left + con.getWidth(ctx)/2, y);
				left += con.getWidth(ctx);
				left += this.hspace;
			}
		};
	}
	repaint(){
		// if selected, use highlight colour
		if(this.selected){
			var strokeColour = this.ctx.strokeStyle;
			this.ctx.strokeStyle = HIGHLIGHT_COLOUR;
			var fillColour = this.ctx.fillStyle;
			this.ctx.fillStyle = HIGHLIGHT_COLOUR;
		}
		// draw box if needed
		if(this.isBoxed){
			const maxWidth = this.getWidth(this.ctx);
			const height = this.getHeight(this.ctx)
			this.ctx.rect(this.x - maxWidth/2, this.y - height/2, maxWidth, height);
			this.ctx.stroke();
		}
		this.subs.forEach(function(item, index, array) {
			item.repaint();
		});
		for (let item of this.connectives){
			item.repaint();
		}
		// restore colour if changed
		if(this.selected){
			this.ctx.strokeStyle = strokeColour;
			this.ctx.fillStyle = fillColour;
		}
	}
  getLatex(){
    let latex = '';
    for (let item of this.subs){
    latex = latex + item.getLatex();
      if(this.subs.indexOf(item) < this.subs.length -1){
        latex = latex + ' ' + this.connectives[this.subs.indexOf(item)].getLatex() + ' ';
      }
    }
		// if boxed, add code
		if(this.isBoxed){
			latex = '\\odbox{' + latex + '}';
		}
    return latex;
  }
	getCopy(){
		let copy = new hjoin();
		// copy subs and connectives
		for (let item of this.subs){
			copy.subs.push(item.getCopy());
		}
		for (let item of this.connectives){
			copy.connectives.push(item.getCopy());
		}
		// copy boxed setting
		if(this.isBoxed) copy.isBoxed = true;
		return copy;
	}
}

class vjoin extends Node{
	constructor(){
		super('vjoin');
		this.vspace = 2;
		this.connectives = [];
	}
	// add node above the given node or at the top if unspecified
	addAbove(node, ref){
		// if unspecified, add at top, else find index to insert above
		let index = 0;
		if(ref != null){
			index = this.subs.indexOf(ref);
		}
		// if no other nodes, no connective needed, else add connective after
		if(this.subs.length !== 0) this.connectives.splice(index, 0, new HLine('single_solid'));
		this.subs.splice(index, 0, node);
	}
	// add node below the given node or at the bottom if unspecified
	addBelow(node, ref){
		// if unspecified, add at bottom, else find index to insert below
		let index = this.subs.length - 1;
		if(ref != null){
			index = this.subs.indexOf(ref);
		}
		// if no other nodes, no connective needed, else add connective before
		if(this.subs.length !== 0) this.connectives.splice(index + 1, 0, new HLine('single_solid'));
		this.subs.splice(index + 1, 0, node);
	}
	getHeight(ctx){
		let totalHeight = 0;
		for (let item of this.subs){
			totalHeight += item.getHeight(ctx);
		}
		for (let item of this.connectives){
			totalHeight += item.getHeight(ctx);
			totalHeight += 2 * this.vspace;
		}
		// if boxed, extra height
		if(this.isBoxed){
			return totalHeight + 10;
		}
		return totalHeight;
	}
	getWidth(ctx){
		let maxWidth = 0;
		this.subs.forEach(function(item, index, array) {
			if(item.getWidth(ctx) > maxWidth) maxWidth = item.getWidth(ctx);
		});
		// if boxed, extra width
		if(this.isBoxed){
			return maxWidth + 10;
		}
		return maxWidth;
		// TO DO - vertical joins with minimum widths (e.g. subscript letters on side of line)
	}
	stage(ctx, x, y){
		let maxWidth = this.getWidth(ctx);
		// if boxed, don't fill to full width
		if(this.isBoxed){
			maxWidth = maxWidth - 10;
		}
		this.ctx = ctx;
		this.x = x;
		this.y = y;
		let top = y - this.getHeight(ctx)/2;
		// if boxed, leave room at top
		if(this.isBoxed){
			top = top + 5;
		}
		for (let item of this.subs) {
			item.stage(ctx, x, top + item.getHeight(ctx)/2);
			top += item.getHeight(ctx);
			top += this.vspace;
			if(this.subs.indexOf(item) < this.subs.length - 1){
				let con = this.connectives[this.subs.indexOf(item)];
				con.setLineWidth(maxWidth);
				con.stage(ctx, x, top);
				top += con.getHeight(ctx);
				top += this.vspace;
			}
		};
	}
	repaint(){
		// if selected, use highlight colour
		if(this.selected){
			var strokeColour = this.ctx.strokeStyle;
			this.ctx.strokeStyle = HIGHLIGHT_COLOUR;
			var fillColour = this.ctx.fillStyle;
			this.ctx.fillStyle = HIGHLIGHT_COLOUR;
		}
		if(this.isBoxed){
			const maxWidth = this.getWidth(this.ctx);
			const height = this.getHeight(this.ctx)
			this.ctx.rect(this.x - maxWidth/2, this.y - height/2, maxWidth, height);
			this.ctx.stroke();
		}
		// paint sub items
		for(let item of this.subs){
			item.repaint();
		}
		for(let item of this.connectives){
			item.repaint();
		}
		// restore colour if changed
		if(this.selected){
			this.ctx.strokeStyle = strokeColour;
			this.ctx.fillStyle = fillColour;
		}
	}
  getLatex(){
    if(this.subs.length < 1) return '';
    else if(this.subs.length === 1) return '\\od{' + this.subs[0].getLatex() + '}';
    let latex = '\\odh{' + this.subs[0].getLatex() + '}';
    for(let i = 1; i < this.subs.length; i++){
      let con = this.connectives[i-1];
      latex = con.getLatexPrefix() + '{' + latex + '}{' + con.getLatexLeft() + '}{' + this.subs[i].getLatex() + '}{' + con.getLatexRight() + '}';
    }
    latex = '\\od{' + latex + '}';
		// if boxed, add code
		if(this.isBoxed){
			latex = '\\odbox{' + latex + '}';
		}
    return latex;
  }
	getCopy(){
		let copy = new vjoin();
		// copy subs and connectives
		for (let item of this.subs){
			copy.subs.push(item.getCopy());
		}
		for (let item of this.connectives){
			copy.connectives.push(item.getCopy());
		}
		// copy boxed setting
		if(this.isBoxed) copy.isBoxed = true;
		return copy;
	}
}

// script to run once page loads
function startScript(){
	myCanvas.start();
}

var myCanvas = {
  canvas : document.getElementById("canvas"),
	// set up function
  start : function() {
		// set 2d context, attach resize listener, set initial canvas size
		this.context = this.canvas.getContext("2d");
		window.addEventListener('resize', myCanvas.resize);
		this.resize();
		this.reset();
  },
	// reset canvas to default node
	reset : function(){
		masterNode = new IncludedUnicodeLeaf();
		unselectElement();
		repaintAll();
	},
	// blank the canvas ready to redraw
	clear : function(){
		this.context.clearRect(0,0, this.canvas.width, this.canvas.height);
	},
	// resize the canvas to fit the screen width
	resize : function(){
		// fit to screen width, min 500
		let newWidth = Math.max(window.innerWidth, 500);
		// fit to half screen height, min 300
		let newHeight = Math.max(window.innerHeight/2, 300);
		this.canvas.width = newWidth;
		this.canvas.height = newHeight;
		repaintAll();
	},
	// find what element was clicked on
	traceClick : function(event){
		// convert from page coordinates to canvas coordinates
		const x = event.pageX - this.canvas.offsetLeft;
		const y = event.pageY - this.canvas.offsetTop;
		// clear selected leaf/node
		unselectElement();
		if(masterNode) masterNode.traceClick(this.context, x, y);
		repaintAll();
	}
}

function selectElement(item){
	unselectElement();
	selectedElement = item;
	if(item == null) return;
	item.setSelected(true);
	// set buttons/text boxes active as relevant to element
	// text leaf
	if(selectedElement.isTextLeaf){
		document.getElementById('leafEditDiv').style.display = 'block';
		let textBox = document.getElementById('textBox');
		if(selectedElement.text === getUnicodeChar(DEFAULT_SYMBOL)){
			textBox.value = '';
		}
		else{
			textBox.value = selectedElement.text;
		}
		textBox.disabled = false;
		// set focus to text box for quick editing
		textBox.focus();
	}
	// vcon vertical connective
	else if(selectedElement.isVCon){
		document.getElementById('vConEditDiv').style.display = 'block';
		const dropdown = document.getElementById('vConStyleSelect');
		dropdown.selectedIndex = optionIndex(dropdown.options, selectedElement.lineType);
		// enable and load text fields
		document.getElementById('vConLeftText').disabled = false;
		document.getElementById('vConRightText').disabled = false;
		document.getElementById('vConLeftText').value = selectedElement.left;
		document.getElementById('vConRightText').value = selectedElement.right;
	}
	// hcon horizontal connective
	else if(selectedElement.isHCon){
		document.getElementById('hConEditDiv').style.display = 'block';
		const dropdown = document.getElementById('hConStyleSelect');
		dropdown.selectedIndex = optionIndex(dropdown.options, latexToUnicodeNameMap.get(selectedElement.latex));
	}
	// joining node
	else if(selectedElement){
		document.getElementById('nodeEditButtons').style.display = 'block';
	}
	// update view
	repaintAll();
}

// return index of specified option from option list
function optionIndex(options, text){
	for(let i = 0; i < options.length; i++){
		if(options[i].value === text){
			return i;
		}
	}
}

function unselectElement(){
	// if 'selected' is non-null, unselect
	if(selectedElement){
		selectedElement.setSelected(false);
		let textBox = document.getElementById('textBox');
		textBox.disabled = true;
		textBox.value = '';
		// hide buttons
		document.getElementById('leafEditDiv').style.display = 'none';
		document.getElementById('vConEditDiv').style.display = 'none';
		document.getElementById('hConEditDiv').style.display = 'none';
		document.getElementById('nodeEditButtons').style.display = 'none';

		// disable text fields in case they're still focused
		document.getElementById('vConLeftText').disabled = true;
		document.getElementById('vConRightText').disabled = true;
	}
	selectedElement = null;
}

// redraw all elements on the canvas
function repaintAll() {
	// sometimes doesn't clear properly, currently called twice to clean up
  myCanvas.clear();
	myCanvas.context.textBaseline = 'middle';
	myCanvas.context.stokeStyle = "#000000";
	myCanvas.context.fillStyle = "#000000";
	if(masterNode != null){
		masterNode.stage(myCanvas.context, myCanvas.canvas.width/2, myCanvas.canvas.height/2);
		masterNode.repaint();
	}
	if(doDrawCentreMark) drawCentreMark(myCanvas.context);
}

// actions specifically for leaves
var leafActions = {
	textBoxInput : function(textbox){
		// if currently selected element is text, update
		if(selectedElement.isTextLeaf){
			if(textBox.value){
				// default has latex for a star - remove when text set
				selectedElement.text = textbox.value;
				selectedElement.latex = '';
			}
			// if textbox empty, set as star
			else{
				selectedElement.text = getUnicodeChar(DEFAULT_SYMBOL);
				selectedElement.latex = nameToUnicodeLatexMap.get(DEFAULT_SYMBOL);
			}
		}
		repaintAll();
	}
}

// general actions for leaves, nodes, connectives, etc
var generalActions = {
	copy : function(){
		if(selectedElement == null) return;
		copiedElement = selectedElement.getCopy();
	},
	paste : function(){
		if(selectedElement == null || copiedElement == null) return;
		masterNode.traceReplace(selectedElement, copiedElement.getCopy());
		repaintAll();
	},
	// delete current element
	delete : function(){
		// if no selected element, return
		if(!selectedElement){
			alert('Select something to delete first');
			return;
		}
		// if element is masterNode, reset to default textBox
		if(selectedElement === masterNode){
			// ask to confirm if more than just a text box
			if(selectedElement.isTextLeaf){
				masterNode = new IncludedUnicodeLeaf();
			}
			else{
				if(confirm('Are you sure you want to delete this whole section?')) masterNode = new IncludedUnicodeLeaf();
				else return;
			}
		}
		// if text leaf selected, remove, if join element selected, delete the construct
		else if(selectedElement.isTextLeaf){
			masterNode.traceRemove(selectedElement);
		}
		else{
			// confirm before deleting
			if(confirm('Are you sure you want to delete this whole section?')) masterNode.traceRemove(selectedElement);
			else return;
		}
		// update view
		unselectElement();
		repaintAll();
	},
	// add new element above the selected element
	addAbove : function(){
		// if no selected element, return
		if(!selectedElement){
			alert('Select an element before trying to add an element above it');
			return;
		}
		// new leaf from default
		const newLeaf = new IncludedUnicodeLeaf();
		// if element is a connective, return
		if(selectedElement.isConnective) return;
		// If element is master node, insert new join at master
		if(selectedElement === masterNode){
			masterNode = new vjoin();
			masterNode.addAbove(newLeaf);
			masterNode.addBelow(selectedElement);
		}
		// if within a vjoin, find index and add above
		else if(masterNode.traceParent(selectedElement).type === 'vjoin'){
			masterNode.traceParent(selectedElement).addAbove(newLeaf, selectedElement);
		}
		// if within a hjoin, insert new vjoin within it preserving existing leaf
		else if(masterNode.traceParent(selectedElement).type === 'hjoin'){
			let newNode = new vjoin();
			newNode.addAbove(newLeaf);
			newNode.addBelow(selectedElement);
			masterNode.traceReplace(selectedElement, newNode);
		}
		// select the new leaf
		selectElement(newLeaf);
		// update view
		repaintAll();
	},
	addBelow : function(){
		// if no selected element, return
		if(!selectedElement){
			alert('Select an element before trying to add an element below it');
			return;
		}
		// new leaf from default
		const newLeaf = new IncludedUnicodeLeaf();
		// if element is connective, return
		if(selectedElement.isConnective) return;
		// If element is master node, insert new join at master
		if(selectedElement === masterNode){
			masterNode = new vjoin();
			masterNode.addBelow(newLeaf);
			masterNode.addAbove(selectedElement);
		}
		// if within a vjoin, find index and add below
		else if(masterNode.traceParent(selectedElement).type === 'vjoin'){
			masterNode.traceParent(selectedElement).addBelow(newLeaf, selectedElement);
		}
		// if within a hjoin, insert new vjoin within it preserving existing leaf
		else if(masterNode.traceParent(selectedElement).type === 'hjoin'){
			let newNode = new vjoin();
			newNode.addBelow(newLeaf);
			newNode.addAbove(selectedElement);
			masterNode.traceReplace(selectedElement, newNode);
		}
		// select the new leaf
		selectElement(newLeaf);
		// update view
		repaintAll();
	},
	addLeft : function(){
		// if no selected element, return
		if(!selectedElement){
			alert('Select an element before trying to add an element left of it');
			return;
		}
		// new leaf from default
		const newLeaf = new IncludedUnicodeLeaf();
		// if element is connective, return
		if(selectedElement.isConnective) return;
		// If element is master node, insert new join at master
		if(selectedElement === masterNode){
			masterNode = new hjoin();
			masterNode.addLeft(newLeaf);
			masterNode.addRight(selectedElement);
		}
		// if within a hjoin, find index and add to left
		else if(masterNode.traceParent(selectedElement).type === 'hjoin'){
			masterNode.traceParent(selectedElement).addLeft(newLeaf, selectedElement);
		}
		// if within a vjoin, insert new hjoin within it preserving existing leaf
		else if(masterNode.traceParent(selectedElement).type === 'vjoin'){
			let newNode = new hjoin();
			newNode.addLeft(newLeaf);
			newNode.addRight(selectedElement);
			masterNode.traceReplace(selectedElement, newNode);
		}
		// select the new leaf
		selectElement(newLeaf);
		// update view
		repaintAll();
	},
	addRight : function(){
		// if no selected element, return
		if(!selectedElement){
			alert('Select an element before trying to add an element right of it');
			return;
		}
		// new leaf from default
		const newLeaf = new IncludedUnicodeLeaf();
		// if element is connective, return
		if(selectedElement.isConnective) return;
		// If element is master node, insert new join at master
		if(selectedElement === masterNode){
			masterNode = new hjoin();
			masterNode.addRight(newLeaf);
			masterNode.addLeft(selectedElement);
		}
		// if within a jjoin, find index and add to right
		else if(masterNode.traceParent(selectedElement).type === 'hjoin'){
			masterNode.traceParent(selectedElement).addRight(newLeaf, selectedElement);
		}
		// if within a vjoin, insert new hjoin within it preserving existing leaf
		else if(masterNode.traceParent(selectedElement).type === 'vjoin'){
			let newNode = new hjoin();
			newNode.addRight(newLeaf);
			newNode.addLeft(selectedElement);
			masterNode.traceReplace(selectedElement, newNode);
		}
		// select the new leaf
		selectElement(newLeaf);
		// update view
		repaintAll();
	},
	// select the parent of the current element
	selectParent : function(){
		// if masternode, can't go heigher
		if(selectedElement == masterNode) return;
		const parent = masterNode.traceParent(selectedElement);
		// if successful, select
		if(parent) selectElement(parent);
		// update view
		repaintAll();
	},
	// reset canvas to default state
	reset : function(){
		// if masterNode is text leaf, don't bother prompting
		if(masterNode.isTextLeaf){
			myCanvas.reset();
		}
		else{
		// else prompt before deleting
			if(confirm('Are you sure you want to delete everything?')) myCanvas.reset();
			else return;
		}
	}
}

// actions specifically for modifying connectives
var conActions = {
	vConStyle : function(dropdown){
		// sanity check that element is hline, then set style
		if(selectedElement.vConType === 'hline'){
			selectedElement.lineType = dropdown.value;
		}
		repaintAll();
	},
	vConLeft : function(textbox){
		selectedElement.left = textbox.value;
	},
	vConRight : function(textbox){
		selectedElement.right = textbox.value;
	},
	hConStyle : function(dropdown){
		// sanity check that element is hcon, then set style
		if(selectedElement.isHCon){
			selectedElement.text = getUnicodeChar(dropdown.value);
			selectedElement.latex = nameToUnicodeLatexMap.get(dropdown.value);
		}
		repaintAll();
	}
}

// actions specifically for nodes
var nodeActions = {
	setBox : function(tickbox){
		if(selectedElement.isBoxed){
			selectedElement.isBoxed = false;
		}
		else{
			selectedElement.isBoxed = true;
		}
		repaintAll();
	}
}

// debug function - mark centre of canvas
function drawCentreMark(context){
	// preserve current colour
	const colour = context.strokeStyle;
	// colour to stand out
	context.strokeStyle="#009000";
	// draw crosshair
	context.beginPath();
	context.moveTo(myCanvas.canvas.width/2 - 10, myCanvas.canvas.height/2 - 10);
	context.lineTo(myCanvas.canvas.width/2 + 10, myCanvas.canvas.height/2 + 10);
	context.moveTo(myCanvas.canvas.width/2 + 10, myCanvas.canvas.height/2 - 10);
	context.lineTo(myCanvas.canvas.width/2 - 10, myCanvas.canvas.height/2 + 10);
	context.stroke();
	context.strokeStyle = colour;
}

// debug function - toggle global variable to mark centre of canvas
function toggleCentreMark(){
	doDrawCentreMark = !doDrawCentreMark;
	repaintAll();
}

// get latex code for current deduction. Calls on masterNode and cascades down tree
function toLatex(){
	// if no node, no latex
  if(masterNode == null) return '';
  let latex = masterNode.getLatex();
	// make sure text isn't null/undefined
  if(latex == undefined) throw new Error('This type is not currently supported');
  // add support code
	// settings
	latex = '\\odframefalse ' + latex;
	latex = '\\vlgoodsyntax ' + latex;
	latex = '$ ' + latex + ' $';
	return latex;
}

// generate latex code for current deduction and display it in popup to copy
function showLatex(){
	if(masterNode.getLatex() == '\\bigstar'){
		window.alert('Create a deduction and then press this button to get the Virginia Lake LaTeX code for it.');
		return false;
	}
  const text = toLatex();
	// if successful, show and return true
	if(text){
		window.prompt('Copy the LaTeX markup below and paste it into your LaTeX editor.\nMake sure to include the Virginia Lake package.', text);
		return true;
	}
	// if unsuccessful, show help text and return false. May be error or just no deduction
	else{
		window.alert('Create a deduction and then press this button to get the Virginia Lake LaTeX code for it.');
		return false;
	}
}

function unicodeToHTML5(unicode){
  // convert Unicode U+ codes to HTML5 &#x representation
  if(unicode.slice(0,1) === 'U+') return null;
  return unicode.replace('U+', '&#x');
}

// Unicode aliases to return codepoints for use in plain HTML5
function getUnicodeHTML(name){
  return '&#x' + nameToUnicodeHexMap.get(name);
}

// Unicode aliases to return codepoints for use in Javascript (i.e. the canvas)
function getUnicodeChar(name){
  return String.fromCharCode(parseInt(nameToUnicodeHexMap.get(name), 16))
}

// map character names to Unicode hex numbers
const nameToUnicodeHexMap = new Map(
	new Array(
		['log_and', '2227'],
		['log_or', '2228'],
		['log_not', '00AC'],
		['turned_ampersand', '214B'],
		['circled_times', '2297'],
		['normal_subgroup_of', '22B2'],
		['multimap', '22B8'],
		['superset_of', '2283'],
		['subset_of', '2282'],
		['psi_lower', '03C8'],
		['right_arrow', '2192'],
		['left_arrow', '2190'],
		['left_right_arrow', '2194'],
		['black_star', '2605']
	)
);

// map character names to latex codes
const nameToUnicodeLatexMap = new Map(
	new Array(
		['log_and', '\\vlan'],
		['log_or', '\\vlor'],
		['log_not', '\\vlne'],
		['turned_ampersand', '\\vlpa'],
		['circled_times', '\\vlte'],
		['normal_subgroup_of', '\\vlse'],
		['multimap', '\\vlli'],
		['superset_of', '\\vljm'],
		['subset_of', '\\vlmj'],
		['psi_lower', '\\psi'],
		['right_arrow', '\\vlim'],
		['left_arrow', '\\vlmi'],
		['left_right_arrow', '\\vldi'],
		['black_star', '\\bigstar']
	)
);

// map latex codes to character names
const latexToUnicodeNameMap = new Map(
	new Array(
		['\\vlan', 'log_and'],
		['\\vlor', 'log_or'],
		['\\vlne', 'log_not'],
		['\\vlpa', 'turned_ampersand'],
		['\\vlte', 'circled_times'],
		['\\vlse', 'normal_subgroup_of'],
		['\\vlli', 'multimap'],
		['\\vljm', 'superset_of'],
		['\\vlmj', 'subset_of'],
		['\\psi', 'psi_lower'],
		['\\vlim', 'right_arrow'],
		['\\vlmi', 'left_arrow'],
		['\\vldi', 'left_right_arrow'],
		['\\bigstar', 'black_star']
	)
);
