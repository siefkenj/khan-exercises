var Matrix = function( m ) {
		/* numbers smaller than ZERO_TOLERANCE in magnitude are treated as zero */
		this.ZERO_TOLERANCE = 0.0000001;
		/* hack so we can return new instance of Matrix from within ourself */
		var Matrix = this.constructor;

		/* some helpful functional programming tools */
		/* jQuery's map function has some annoying behavior.
		 * i.e., if you return an array, it extends the result instead
		 * of pushing the new array onto the result.  Not good when
		 * you have to traverse a bunch of 2d arrays! */
		var map = function(a, f){ 	
			var ret = [];
			for(var i = 0; i < a.length; i++){
				ret.push(f(a[i]));
			}
			return ret;
		};
		var zip = function(a,b){
			var ret = [];
			var l = Math.min(a.length, b.length);
			for(var i = 0; i < l; i++){
				ret.push([a[i],b[i]]);
			}
			return ret;
		};
		var sum = function(a){
			var ret = 0;
			for(var i = 0; i < a.length; i++){
				ret += a[i];
			}
			return ret;
		};
		var prod = function(a){
			var ret = 1;
			for(var i = 0; i < a.length; i++){
				ret *= a[i];
			}
			return ret;
		};

		/* copy an array two levels deep */
		var deepCopyArray = function (a){
			//slice returns a copy of the array
			return map(a, function(x){ return x.slice(); });
		};
		/* dot product of two arrays */
		var arrayDotProd = function (a,b){
			if(a.length != b.length){ throw "Size of dot products do not match!"; }
			return sum(map(zip(a,b), prod));
		};

		/* element-wise sum of two arrays */
		var arrayAdd = function(a,b){
			return map(zip(a,b), sum);
		};

		/* initialize our data */
		this.array = deepCopyArray(m);
		this.dims = [this.array.length, this.array[0].length];

		/* returns the matrix in array notation */
		this.toString = function(){ 
			var row_texts = [];
			for(var row = 0; row < this.array.length; row++){
				row_texts.push("[" + this.array[row].join(", ") + "]");
			}
			return "["+row_texts.join(", ")+"]";
		};
		/* returns latex code for the matrix */
		this.toCode = function(){
			var row_texts = [];
			for(var row = 0; row < this.array.length; row++){
				row_texts.push(this.array[row].join(" & "));
			}
			return "\\begin{bmatrix}"+row_texts.join("\\\\")+"\\end{bmatrix}";
		}
		/* returns the i,j element.  If i=':' or j=':',
		 * it returns the whole row or column
		 */
		this.get = function(i,j){
			if(i == ':' && j == ':'){ return new Matrix(this.array); }
			if(j == ':'){
				//return a copy of the row
				return this.array[i].slice();
			}
			if(i == ':'){
				return map(this.array, function(row){ return row[j]; });
			}
			return this.array[i][j]
		}
		/* return the diagonal entries */
		this.diag = function(){
			var max_entry = Math.min(this.dims[0], this.dims[1]);
			var ret = [];
			for(var i = 0; i < max_entry; i++){
				ret.push(this.array[i][i]);
			}
			return ret;
		};
		this.is_square = function(){
			return (this.dims[0] == this.dims[1]);
		};


		/* add two matrices */
		this._add_mat = function(other){
			var ret = map( zip(this.array, other.array), 
				       function(a){ return arrayAdd(a[0], a[1]) } );
			return new Matrix(ret);
		};
		
		/* add a number to the matrix */
		this._add_num = function(other){
			var add_other = function(a){ return a + other; };
			var ret = map(this.array, function(row){ return map(row, add_other); });
			return new Matrix(ret);
		};

		/* add a number or matrix to this */
		this.add = function(other){
			if(other instanceof Matrix){
				return this._add_mat(other);
			}else{
				return this._add_num(other);
			}
		};
		/* multiply a matrix by a number */
		this._mul_num = function(other){
			var mul_other = function(a){ return a*other; };
			var ret = map(this.array, function(row){ return map(row, mul_other); });
			return new Matrix(ret);
		};
		/* multiply two matrices */
		this._mul_mat = function(other){
			if(this.dims[1] != other.dims[0]){ throw "Cannot multiply matrices of size "+this.dims+" by "+other.dims+"."; }
			var new_array = [];
			var rows = this.array, cols = other.transpose().array;
			for(var i = 0; i < rows.length; i++){
				var dot_with_ith_row = function(x){ return arrayDotProd(rows[i], x); };
				//append a new row vector consisting of each column of other dotted with the ith row of this
				new_array.push(map(cols, dot_with_ith_row));
			}
			return new Matrix(new_array)
		};
		/* multiply a matrix by a matrix or number */
		this.mul = function(other){
			if(other instanceof Matrix){
				return this._mul_mat(other);
			}else{
				return this._mul_num(other);
			}
		};
		/* return the transpose of this */
		this.transpose = function(){
			var new_array = [];
			//loop through the columns of this.array
			for(var i = 0; i < this.dims[1]; i++){
				var return_ith_componant = function(x){ return x[i]; };
				//append the array consisting of the ith column of this.array
				new_array.push(map(this.array, return_ith_componant));
			}
			return new Matrix(new_array);
		};

		/* elementary row operations */
		this.row_op_multiply_row_by_const = function(val, row){
			if( row >= this.dims[0] ){ throw "Row "+row+" out of range for matrix of size "+this.dims+"."; }
			var new_array = deepCopyArray(this.array);
			new_array[row] = map(new_array[row], function(x){ return x*val; });
			return new Matrix(new_array);
		}
		this.row_op_add_mul_of_one_row_to_another = function(x,n,m){
			if( n >= this.dims[0] || m >= this.dims[0]){ throw "Rows "+[m,n]+" out of range for matrix of size "+this.dims+"."; }
			var ret = new Matrix(this.array);
			for(var i = 0; i < ret.array[m].length; i++){
				ret.array[m][i] += x*ret.array[n][i];
			}
			return ret;
		}
		this.swap_two_rows = function(row1, row2){
			if( row1 >= this.dims[0] || row2 >= this.dims[0]){ throw "Rows "+[row1,row2]+" out of range for matrix of size "+this.dims+"."; }
			var ret = new Matrix(this.array);
			var tmp = ret.array[row1];
			ret.array[row1] = ret.array[row2];
			ret.array[row2] = tmp;
			return ret;
		}

		/* row reduction */
		/* row reduce the matrix to an upper triangular
		 * matrix suitable for back substitution */
		this.ref = function(){
			return this._reduce_to_stage('ref')['matrix'];
		};
		/* return the reduced row echelon form */
		this.rref = function(){
			return this._reduce_to_stage('rref')['matrix'];
		};
		/* row-reduce a matrix to stage ref, pre-rref, or rref */
		this._reduce_to_stage = function(stage){
			var self = this;
			/* componant-wise subtraction of v1-m*v2 of two row vectors */
			var substractMultipleOfVecs = function(v1, v2, m){
				var ret = v1.slice(); 	//make a copy of v1
				var i;
				for(i in v2){
					ret[i] -= m*v2[i];
				}
				return ret;
			};
			/* pass in a 2d array and it returns the first
			 * non-zero entry in column col in a 
			 * row >= min_row.  If there are none, it returns
			 * null.
			 */
			var findNonzeroEntry = function(array, col, min_row){
				for(var i = min_row; i < array.length; i++){
					if(Math.abs(array[i][col]) > self.ZERO_TOLERANCE){
						return i;
					}
				}
				return null;
			};
			/* uses the pivot in position row,col to zero all entries below */
			var zeroBelow = function(array, row, col){
				for(var i = row + 1; i < array.length; i++){
					array[i] = substractMultipleOfVecs(array[i], array[row], array[i][col]/array[row][col]);
				}
			};
			var zeroAbove = function(array, row, col){
				for(var i = row - 1; i >= 0; i--){
					array[i] = substractMultipleOfVecs(array[i], array[row], array[i][col]/array[row][col]);
				}
			};
			var swapRows = function(array, row1, row2){
				var tmp = array[row1];
				array[row1] = array[row2];
				array[row2] = tmp;
			}

			/* do the actual row reduction */
			var new_array = deepCopyArray(this.array);
			var pivot_row = 0, pivot_pos = [], num_row_swaps = 0;
			for(var pivot_col = 0; pivot_col < new_array[0].length; pivot_col++){
				var non_zero_row = findNonzeroEntry(new_array, pivot_col, pivot_row);
				if( non_zero_row != null ){
					//move a row with non-zero leading entry into the pivot position
					if( pivot_row != non_zero_row ){
						swapRows(new_array, pivot_row, non_zero_row);
						num_row_swaps += 1;
					}
					zeroBelow(new_array, pivot_row, pivot_col);
					pivot_pos.push({'row':pivot_row, 'col':pivot_col});  //if we used this as a pivot, add it to the list
					pivot_row += 1;
				}
			}
			//if we only want row-echelon form, we've already got it!
			if( stage == 'ref' ){
				return {'matrix': new Matrix(new_array), 'row_swaps': num_row_swaps, 'pivot_col': pivot_pos};
			}

			/* continue reducing until we get to pre-rref */
			//since we already know exactly where our pivots are, this is really easy
			map(pivot_pos, function(pos){ zeroAbove(new_array, pos['row'], pos['col']); });
			if( stage == 'pre-ref'){
				return {'matrix': new Matrix(new_array), 'row_swaps': num_row_swaps, 'pivot_col': pivot_pos};
			}

			/* continue to full rref */
			//once again, we know what our pivot rows are, so this is really easy
			map(pivot_pos, function(pos){ 
				var pivot_val = new_array[pos['row']][pos['col']];
				new_array[pos['row']] = map(new_array[pos['row']], function(x){ return x/pivot_val; });
			});
			return {'matrix': new Matrix(new_array), 'row_swaps': num_row_swaps, 'pivot_col': pivot_pos};

		}

		/* returns the determinant of the matrix */
		this.det = function(){
			if(!this.is_square()){
				return 0;
			}
			//reduce the matrix to upper triangular while keeping track of row swaps
			var reduced = this._reduce_to_stage('ref');
			var diag = reduced['matrix'].diag();
			return Math.pow(-1, reduced['row_swaps'])*prod(diag);
		}
}
/* matrix object that keeps all entries as strings
 * and applies operations symbolically.  e.g.,
 * [[1]]+[[2]] = [['1+2']] */
var SymbolicMatrix = function(m){
		var SymbolicMatrix = this.constructor;
		var isMatrixType = function(x){
			return x instanceof Matrix || x instanceof SymbolicMatrix;
		}

		this.array = m;
		if(isMatrixType(m)){
			this.array = m.array;
		}
		/* define some functional tools */
		var map = function(a, f){ 	
			var ret = [];
			for(var i = 0; i < a.length; i++){
				ret.push(f(a[i]));
			}
			return ret;
		};
		var zip = function(a,b){
			var ret = [];
			var l = Math.min(a.length, b.length);
			for(var i = 0; i < l; i++){
				ret.push([a[i],b[i]]);
			}
			return ret;
		};
		var sum = function(a){
			return a.join('+');
		};
		var prod = function(a){
			return a.join('*');
		};
		
		/* copy an array two levels deep */
		var deepCopyArray = function (a){
			//slice returns a copy of the array
			return map(a, function(x){ return x.slice(); });
		};
		/* returns the matrix in array notation */
		this.toString = function(){ 
			var row_texts = [];
			for(var row = 0; row < this.array.length; row++){
				row_texts.push("[" + this.array[row].join(", ") + "]");
			}
			return "["+row_texts.join(", ")+"]";
		};
		/* adds a scalar or another number to this */
		this.add = function(other){
			if(isMatrixType(other)){
				var new_array = map(zip(this.array, other.array), function(x){
					return map(zip(x[0],x[1]), sum);
				});
				return new SymbolicMatrix(new_array)
			}else{
				var add_other_to_row = function(row){ 
					return map(row, function(x){ return x+'+'+other; });
				};
				var new_array = map(this.array, add_other_to_row);
				return new SymbolicMatrix(new_array);
			}
		}
		/* return the transpose of this */
		this.transpose = function(){
			var new_array = [];
			//loop through the columns of this.array
			for(var i = 0; i < this.dims[1]; i++){
				var return_ith_componant = function(x){ return x[i]; };
				//append the array consisting of the ith column of this.array
				new_array.push(map(this.array, return_ith_componant));
			}
			return new Matrix(new_array);
		};
};

/* Returns a SymbolicMatrix version of mat with latex color
 * formatting applied.  row,col use slicing notation.
 * i.e., row=':' will color that entire row and col=':'
 * will color the entire column.  if row,col=':',':'
 * the whole matrix will be colored */
var colorizeMatrix = function(mat, color, row, col){
		/* set row, col to the defualt values if they're undefined */
		if(typeof row === 'undefined'){ row = ':'; }
		if(typeof col === 'undefined'){ col = ':'; }

		/* copy an array two levels deep */
		var deepCopyArray = function (a){
			//slice returns a copy of the array
			return map(a, function(x){ return x.slice(); });
		};
		/* define some functional tools */
		var map = function(a, f){ 	
			var ret = [];
			for(var i = 0; i < a.length; i++){
				ret.push(f(a[i]));
			}
			return ret;
		};

		/* wraps whatever value we pass in in a color tag */
		var apply_color = function(x){
			return '\\color{'+color+'}{'+x+'}';
		}

		var new_array = deepCopyArray(mat.array);
		if(row == ':' && col == ':'){
			new_array = map(new_array, function(x){
				return map(x, apply_color);
			});
		}else if(row == ':' && col != ':'){
			var apply_color_to_col = function(x){ 
				x[col] = apply_color(x[col]);
				return x;
			};
			new_array = map(new_array, apply_color_to_col);
		}else if(row != ':' && col == ':'){
			new_array[row] = map(new_array[row], apply_color);
		}else{ //no slicing, just change the single entry
			new_array[row][col] = apply_color(new_array[row][col]);
		}
		
		return new SymbolicMatrix(new_array);
};

/* matrix to latex conversion. 
 * braces is in ['[', '(', '|'].  Defaults to '['
 */
var formatMatrix = function(mat, braces){
		this.array = mat.array;
		var latex_brace = 'bmatrix';
		if(braces == '('){ latex_brace = 'pmatrix'; }
		if(braces == '|'){ latex_brace = 'vmatrix'; }
		
		/* define some functional tools */
		var map = function(a, f){ 	
			var ret = [];
			for(var i = 0; i < a.length; i++){
				ret.push(f(a[i]));
			}
			return ret;
		};

		var transformed_rows = map(this.array, function(x){ return x.join(' & '); });
		return '\\begin{'+latex_brace+'}'+transformed_rows.join('\\\\')+'\\end{'+latex_brace+'}'

};

/* test cases */
var mm = new Matrix([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 10]]);
document.write([mm, mm.transpose(), mm.det(), mm.ref()]);
document.write('<br/>');
var mm2 = new Matrix([[4,0,6],[7,8,8], [0, 0, 3]]);
document.write([mm2._reduce_to_stage('rref')['matrix'] + 'xxx', mm2.det(), mm2].join(' '));
document.write('<br/>');
document.write(mm2.mul(mm2));
document.write('<br/>');
document.write([mm2, mm2.mul(mm2)]);
document.write('<br/>');
document.write('<br/>');
var mm3 = new SymbolicMatrix([[1,2],[3,4]]);
document.write([mm3, mm3.add(3), mm3.add(mm3)]);
document.write('<br/>');
document.write([colorizeMatrix(mm3, 'blue',':',1)]);
document.write('<br/>');
document.write(formatMatrix(mm3));
