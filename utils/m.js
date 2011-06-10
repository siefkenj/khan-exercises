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
			var ret = new Array();
			for(var i = 0; i < a.length; i++){ ret.push( a[i].slice() ); }
			return ret;
		};
		/* dot product of two arrays */
		var arrayDotProd = function (a,b){
			if(a.length != b.length){ throw "Size of dot products do not match!"; }
		/*	var ret = 0;
			var i;
			for(var i = 0; i < a.length; i++){
				ret += a[i]*b[i];
			}
			return ret;
		*/
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
			/*	var ret = [];
				var n;
				for(n in this.array){ ret.push(this.array[n][j]); }
				return ret;
			*/
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
			/* var ret = new Matrix(this.array);
			var i, j;
			for(i in ret.array){
				for(j in ret.array[i]){
					ret.array[i][j] += other.array[i][j];
				}
			}
			return ret
			*/
		};
		
		/* add a number to the matrix */
		this._add_num = function(other){
			var add_other = function(a){ return a + other; };
			var ret = map(this.array, function(row){ return map(row, add_other); });
			return new Matrix(ret);
			/*
			var ret = new Matrix(this.array);
			var i, j;
			for(i in ret.array){
				for(j in ret.array[i]){
					ret.array[i][j] += other;
				}
			}
			return ret */
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
			/*var ret = new Matrix(this.array);
			var i, j;
			for(i in ret.array){
				for(j in ret.array[i]){
					ret.array[i][j] *= other;
				}
			}
			return ret*/
		};
		/* multiply two matrices */
		this._mul_mat = function(other){
			if(this.dims[1] != other.dims[0]){ throw "Cannot multiply matrices of size "+this.dims+" by "+other.dims+"."; }
			var new_array = [];
			var i, j;
			for(i in this.array){
				var row = []
				for(j in other.array[0]){
					row.push(arrayDotProd( this.get(i,":"), other.get(":", j) ));
				}
				new_array.push(row)
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
			var new_array = Array(this.dims[1]);
			var col;
			for(col in this.array[0]){
				new_array[col] = []
				var row;
				for(row in this.array){
					new_array[col].push(this.array[row][col]);
				}
			}
			return new Matrix(new_array);
		};

		/* elementary row operations */
		this.row_op_multiply_row_by_const = function(val, row){
			if( row >= this.dims[0] ){ throw "Row "+row+" out of range for matrix of size "+this.dims+"."; }
			var ret = new Matrix(this.array);
			var i;
			for(i in ret.array[row]){
				ret.array[row][i] *= val;
			}
			return ret;
		}
		this.row_op_add_mul_of_one_row_to_another = function(x,n,m){
			if( n >= this.dims[0] || m >= this.dims[0]){ throw "Rows "+[m,n]+" out of range for matrix of size "+this.dims+"."; }
			var ret = new Matrix(this.array);
			var i;
			for(i in ret.array[m]){
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
			return this.to_upper_triangular_with_stats()[0];
		};
		/* return the reduced row echelon form */
		this.rref = function(){
			var reduced = this.to_upper_triangular_with_stats();
			var new_array = deepCopyArray(reduced[0].array);
			/* TODO */
			return null;
		};
		/* row reduce to an upper triangular 
		 * matrix and return the result aswell as 
		 * the number of row exchanges used
		 */
		this.to_upper_triangular_with_stats = function(){
			var self = this;
			/* componant-wise subtraction of v1-m*v2 of two row vectors */
			function substractMultipleOfVecs(v1, v2, m){
				var ret = v1.slice(); 	//make a copy of v1
				var i;
				for(i in v2){
					ret[i] -= m*v2[i];
				}
				return ret;
			}
			/* pass in a 2d array and it returns the first
			 * non-zero entry in column col in a 
			 * row >= min_row.  If there are none, it returns
			 * null.
			 */
			function findNonzeroEntry(array, col, min_row){
				for(var i = min_row; i < array.length; i++){
					if(Math.abs(array[i][col]) > self.ZERO_TOLERANCE){
						return i;
					}
				}
				return null;
			}
			/* uses the pivot in position row,col to zero all entries below */
			function zeroBelow(array, row, col){
				for(var i = row + 1; i < array.length; i++){
					array[i] = substractMultipleOfVecs(array[i], array[row], array[i][col]/array[row][col]);
				}
			}
			function swapRows(array, row1, row2){
				var tmp = array[row1];
				array[row1] = array[row2];
				array[row2] = tmp;
			}

			/* do the actual row reduction */
			var new_array = deepCopyArray(this.array);
			var pivot_row = 0, pivot_rows = [], num_row_swaps = 0;
			for(var pivot_col = 0; pivot_col < new_array[0].length; pivot_col++){
				var non_zero_row = findNonzeroEntry(new_array, pivot_col, pivot_row);
				if( non_zero_row != null ){
					//move a row with non-zero leading entry into the pivot position
					if( pivot_row != non_zero_row ){
						swapRows(new_array, pivot_row, non_zero_row);
						num_row_swaps += 1;
					}
					zeroBelow(new_array, pivot_row, pivot_col);
					pivot_rows.push(pivot_row);  //if we used this as a pivot, add it to the list
					pivot_row += 1;
				}
			}

			return [new Matrix(new_array), num_row_swaps, pivot_rows];
		}

		/* returns the determinant of the matrix */
		this.det = function(){
			if(!this.is_square()){
				return 0;
			}
			var reduced = this.to_upper_triangular_with_stats();
			var ret = 1;
			var diag = reduced[0].diag();
			for(var i = 0; i < diag.length; i++){
				ret *= diag[i];
			}
			return Math.pow(-1, reduced[1])*ret;
		}

}


/* test cases */
var mm = new Matrix([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 10]]);
document.write([mm, mm.transpose(), mm.det(), mm.ref()]);
document.write('<br/>');
var mm2 = new Matrix([[4,0,6],[7,8,8], [0, 0, 3]]);
document.write([mm2.to_upper_triangular_with_stats(), mm2.det(), mm2].join(' '));
document.write('<br/>');
document.write(mm2.mul(mm2));
document.write('<br/>');
document.write([mm2, mm2.add(mm2)]);
