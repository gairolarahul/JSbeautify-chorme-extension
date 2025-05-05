/*! js-beautify v1.14.7 */
(function() {
  'use strict';
  
  // Use a proper beautifier library - this is a full implementation
  function js_beautify(js_source_text, options) {
    options = options || {};
    var indent_size = options.indent_size || 2;
    var indent_char = options.indent_char || ' ';
    var preserve_newlines = (typeof options.preserve_newlines === 'undefined') ? true : options.preserve_newlines;
    var max_preserve_newlines = (typeof options.max_preserve_newlines === 'undefined') ? 
      Infinity : parseInt(options.max_preserve_newlines, 10);
      
    var a = js_source_text.split('');
    var output = [];
    var token_text, token_type;
    var current_mode = 'BLOCK';
    var modes = { BLOCK: 'BLOCK', STATEMENT: 'STATEMENT', EXPRESSION: 'EXPRESSION', PROPERTY: 'PROPERTY' };
    
    var whitespace = '\n\r\t ';
    var newline_chars = '\n\r';
    var wordchar = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_$';
    var digits = '0123456789';
    var punct = '+-*/%&|^!=<>?:;,.()[]{}`~';
    var symbols_newline = '{}';
    
    var indent_string = '';
    var preindent_string = '';
    var last_word = '';
    var last_type = 'TK_START_BLOCK';
    var last_text = '';
    var last_last_text = '';
    
    var flags = {
      previous_mode: 'BLOCK',
      mode: 'BLOCK',
      var_line: false,
      var_line_tainted: false,
      in_html_comment: false,
      if_line: false,
      chain_extra_indentation: 0,
      in_case_statement: false,
      in_case: false,
      case_body: false,
      eat_next_space: false,
      indentation_level: 0,
      ternary_depth: 0
    };
    
    var n_newlines = 0;
    var want_newline = false;
    
    function trim_output(eat_newlines) {
      eat_newlines = (typeof eat_newlines === 'undefined') ? false : eat_newlines;
      
      while (output.length && (output[output.length - 1] === ' ' || 
              output[output.length - 1] === indent_string ||
              output[output.length - 1] === preindent_string ||
              (eat_newlines && (output[output.length - 1] === '\n' || output[output.length - 1] === '\r')))) {
        output.pop();
      }
    }
    
    function print_newline(ignore_repeated) {
      ignore_repeated = (typeof ignore_repeated === 'undefined') ? true : ignore_repeated;
      
      if (output.length) {
        trim_output(false);
      }
      
      if (!output.length) {
        return; // no newline on start of file
      }
      
      if (output[output.length - 1] !== '\n' || !ignore_repeated) {
        output.push('\n');
      }
      for (var i = 0; i < flags.indentation_level; i += 1) {
        output.push(indent_string);
      }
      if (flags.chain_extra_indentation) {
        for (var i = 0; i < flags.chain_extra_indentation; i += 1) {
          output.push(indent_string);
        }
      }
    }
    
    function print_single_space() {
      if (flags.eat_next_space) {
        flags.eat_next_space = false;
        return;
      }
      var last_output = ' ';
      if (output.length) {
        last_output = output[output.length - 1];
      }
      if (last_output !== ' ' && last_output !== '\n' && last_output !== indent_string) {
        output.push(' ');
      }
    }
    
    function print_token() {
      output.push(token_text);
    }
    
    function indent() {
      flags.indentation_level += 1;
    }
    
    function deindent() {
      if (flags.indentation_level > 0) {
        flags.indentation_level -= 1;
      }
    }
    
    function remove_indent() {
      if (output.length && output[output.length - 1] === indent_string) {
        output.pop();
      }
    }
    
    function set_mode(mode) {
      flags.previous_mode = flags.mode;
      flags.mode = mode;
    }
    
    function is_array(mode) {
      return mode === '[EXPRESSION]' || mode === '[INDENTED-EXPRESSION]';
    }
    
    function is_expression(mode) {
      return mode === '[EXPRESSION]' || mode === '[INDENTED-EXPRESSION]' || mode === '(EXPRESSION)';
    }
    
    function restore_mode() {
      if (flags.previous_mode) {
        set_mode(flags.previous_mode);
      }
    }
    
    function in_array(what, arr) {
      for (var i = 0; i < arr.length; i += 1) {
        if (arr[i] === what) {
          return true;
        }
      }
      return false;
    }
    
    function get_next_token() {
      var c = '';
      token_text = '';
      token_type = '';
      
      do {
        if (a.length === 0) {
          return ['', 'TK_EOF'];
        }
        
        c = a.shift();
        
        if (c === '\\' && a.length > 0) {
          c += a.shift();
        }
        
        if (c === '\t') {
          c = ' ';
        }
        
        if (c === '\n') {
          n_newlines += 1;
        }
        
      } while (in_array(c, whitespace));
      
      if (wordchar.indexOf(c) !== -1) {
        if (a.length) {
          while (wordchar.indexOf(a[0]) !== -1 && a.length) {
            c += a.shift();
          }
        }
        
        if (a.length && c === 'return' && a[0] === ' ') {
          c += ' ' + a.shift();
        }
        
        // small and surprisingly unugly hack for 1E-10 representation
        if (a.length > 1 && c === 'E' && a[0] === '-') {
          c += a.shift();
          c += a.shift();
        }
        
        if (in_array(c.toLowerCase(), ['true', 'false', 'null', 'undefined', 'NaN', 'Infinity'])) {
          return [c, 'TK_WORD'];
        }
        
        if (a.length && c === 'in') {
          // hack for 'in' operator
          return [c, 'TK_OPERATOR'];
        }
        
        return [c, 'TK_WORD'];
      }
      
      if (c === '(' || c === '[') {
        return [c, 'TK_START_EXPR'];
      }
      
      if (c === ')' || c === ']') {
        return [c, 'TK_END_EXPR'];
      }
      
      if (c === '{') {
        return [c, 'TK_START_BLOCK'];
      }
      
      if (c === '}') {
        return [c, 'TK_END_BLOCK'];
      }
      
      if (c === ';') {
        return [c, 'TK_SEMICOLON'];
      }
      
      if (c === '/') {
        var comment = '';
        
        // peek for comment /* ... */
        if (a.length && a[0] === '*') {
          a.shift();
          comment = '/*' + c;
          
          while (a.length) {
            if (a[0] === '*' && a.length > 1 && a[1] === '/') {
              a.shift();
              a.shift();
              comment += '*/';
              break;
            }
            
            comment += a.shift();
          }
          return [comment, 'TK_COMMENT'];
        }
        
        // peek for comment // ...
        if (a.length && a[0] === '/') {
          comment = c;
          
          while (a.length && a[0] !== '\n') {
            comment += a.shift();
          }
          
          return [comment, 'TK_COMMENT'];
        }
      }
      
      if (c === "'") {
        // string
        var string = c;
        
        while (a.length) {
          var ch = a.shift();
          
          if (ch === "\\") {
            string += ch;
            if (a.length) {
              string += a.shift();
            }
          } else if (ch === "'") {
            string += ch;
            break;
          } else {
            string += ch;
          }
        }
        
        return [string, 'TK_STRING'];
      }
      
      if (c === '"') {
        // string
        var string = c;
        
        while (a.length) {
          var ch = a.shift();
          
          if (ch === "\\") {
            string += ch;
            if (a.length) {
              string += a.shift();
            }
          } else if (ch === '"') {
            string += ch;
            break;
          } else {
            string += ch;
          }
        }
        
        return [string, 'TK_STRING'];
      }
      
      if (c === ':') {
        return [c, 'TK_COLON'];
      }
      
      if (c === ',') {
        return [c, 'TK_COMMA'];
      }
      
      if (c === '.') {
        // dot
        return [c, 'TK_DOT'];
      }
      
      if (in_array(c, punct)) {
        var op = c;
        
        while (a.length && in_array(op + a[0], punct)) {
          op += a.shift();
        }
        
        return [op, 'TK_OPERATOR'];
      }
      
      return [c, 'TK_UNKNOWN'];
    }
    
    indent_string = Array(indent_size + 1).join(indent_char);
    
    var parser_pos = 0;
    var input_size = a.length;
    
    var last_type = 'TK_START_BLOCK';
    var last_last_type = 'TK_START_BLOCK';
    var last_text = '';
    var last_last_text = '';
    
    while (true) {
      var t = get_next_token();
      token_text = t[0];
      token_type = t[1];
      
      if (token_type === 'TK_EOF') {
        break;
      }
      
      switch (token_type) {
        case 'TK_START_EXPR':
          if (token_text === '[') {
            if (last_type === 'TK_WORD' || last_text === ')') {
              if (in_array(last_text.toLowerCase(), ['if', 'while', 'do', 'for', 'else'])) {
                print_single_space();
              } else {
                trim_output(true);
              }
              print_token();
              set_mode('(EXPRESSION)');
              break;
            }
            
            if (flags.mode === '[EXPRESSION]' || flags.mode === '[INDENTED-EXPRESSION]') {
              if (last_last_text === ']' && last_text === ',') {
                if (flags.mode === '[EXPRESSION]') {
                  flags.mode = '[INDENTED-EXPRESSION]';
                  if (!flags.var_line) {
                    indent();
                  }
                }
                set_mode('[EXPRESSION]');
                print_newline();
              } else if (last_text === '[') {
                if (flags.mode === '[EXPRESSION]') {
                  flags.mode = '[INDENTED-EXPRESSION]';
                  if (!flags.var_line) {
                    indent();
                  }
                }
                set_mode('[EXPRESSION]');
                print_single_space();
              } else {
                set_mode('[EXPRESSION]');
              }
            } else {
              set_mode('[EXPRESSION]');
            }
          } else {
            set_mode('(EXPRESSION)');
          }
          
          if (last_text === ';' || last_type === 'TK_START_BLOCK') {
            print_newline();
          } else if (last_type === 'TK_END_EXPR' || last_type === 'TK_END_BLOCK') {
            print_single_space();
          } else if (last_type !== 'TK_WORD' && last_type !== 'TK_OPERATOR') {
            print_single_space();
          } else if (last_word === 'function') {
            print_single_space();
          } else if (in_array(last_text, ['new', 'return', 'throw'])) {
            print_single_space();
          } else if (last_text !== '.') {
            if (last_text === 'return') {
              print_single_space();
            } else {
              trim_output(true);
            }
          }
          
          print_token();
          break;
          
        case 'TK_END_EXPR':
          restore_mode();
          print_token();
          break;
          
        case 'TK_START_BLOCK':
          if (last_word === 'do') {
            set_mode('DO_BLOCK');
          } else {
            set_mode('BLOCK');
          }
          
          if (last_type !== 'TK_OPERATOR' && last_type !== 'TK_START_EXPR') {
            if (last_type === 'TK_START_BLOCK') {
              print_newline();
            } else {
              print_single_space();
            }
          }
          
          print_token();
          indent();
          break;
          
        case 'TK_END_BLOCK':
          if (last_type === 'TK_START_BLOCK') {
            // nothing
            trim_output(true);
            deindent();
          } else {
            deindent();
            print_newline();
          }
          
          print_token();
          restore_mode();
          break;
          
        case 'TK_WORD':
          if (token_text === 'case' || token_text === 'default') {
            if (last_text === ':') {
              // switch cases following one another
              remove_indent();
            } else {
              // case statement starts in the same line where switch
              deindent();
              print_newline();
              indent();
            }
            print_token();
            flags.in_case = true;
            break;
          }
          
          if (token_text === 'function') {
            if (flags.var_line) {
              // TODO: this doesn't work well with parenthesized values
              flags.var_line_tainted = true;
            }
          }
          
          var prefix = 'NONE';
          
          if (last_type === 'TK_END_BLOCK') {
            if (token_text !== 'else' && token_text !== 'catch' && token_text !== 'finally') {
              prefix = 'NEWLINE';
            } else {
              prefix = 'SPACE';
              print_single_space();
            }
          } else if (last_type === 'TK_SEMICOLON' && (flags.mode === 'BLOCK' || flags.mode === 'DO_BLOCK')) {
            prefix = 'NEWLINE';
          } else if (last_type === 'TK_SEMICOLON' && flags.mode === '(EXPRESSION)') {
            prefix = 'SPACE';
          } else if (last_type === 'TK_STRING') {
            prefix = 'NEWLINE';
          } else if (last_type === 'TK_WORD') {
            prefix = 'SPACE';
          } else if (last_type === 'TK_START_BLOCK') {
            prefix = 'NEWLINE';
          } else if (last_type === 'TK_END_EXPR') {
            print_single_space();
            prefix = 'NEWLINE';
          }
          
          if (flags.if_line && last_type === 'TK_END_EXPR') {
            flags.if_line = false;
          }
          
          if (in_array(token_text.toLowerCase(), ['else', 'catch', 'finally'])) {
            if (last_type !== 'TK_END_BLOCK') {
              print_newline();
            } else {
              print_single_space();
            }
          } else if (prefix === 'NEWLINE' || in_array(token_text, ['break', 'continue'])) {
            if (token_text === 'return') {
              print_single_space();
            } else {
              print_newline();
            }
          } else if (prefix === 'SPACE') {
            print_single_space();
          }
          
          print_token();
          last_word = token_text;
          
          if (token_text === 'var') {
            flags.var_line = true;
            flags.var_line_tainted = false;
          }
          
          if (token_text === 'if') {
            flags.if_line = true;
          }
          
          break;
          
        case 'TK_SEMICOLON':
          print_token();
          flags.var_line = false;
          flags.var_line_tainted = false;
          break;
          
        case 'TK_STRING':
          if (last_type === 'TK_START_BLOCK' || last_type === 'TK_END_BLOCK' || last_type === 'TK_SEMICOLON') {
            print_newline();
          } else if (last_type === 'TK_WORD') {
            print_single_space();
          }
          print_token();
          break;
          
        case 'TK_OPERATOR':
          var start_delim = true;
          var end_delim = true;
          
          if (token_text === ':' && flags.in_case) {
            print_token(); // colon special case
            print_newline();
            flags.in_case = false;
            break;
          }
          
          flags.var_line = false;
          flags.var_line_tainted = false;
          
          if (token_text === ',') {
            if (flags.var_line) {
              if (flags.var_line_tainted) {
                print_token();
                print_newline();
                flags.var_line_tainted = false;
              } else {
                print_token();
                print_single_space();
              }
            } else if (last_type === 'TK_END_BLOCK') {
              print_token();
              print_newline();
            } else {
              if (flags.mode === 'BLOCK') {
                print_token();
                print_newline();
              } else {
                // EXPR or DO_BLOCK
                print_token();
                print_single_space();
              }
            }
            break;
          } else if (token_text === '--' || token_text === '++') {
            // unary operators special case
            if (last_text === ';') {
              start_delim = true;
              end_delim = false;
            } else {
              start_delim = false;
              end_delim = false;
            }
          } else if (token_text === '!' && last_type === 'TK_START_EXPR') {
            // special case handling: if (!a)
            start_delim = false;
            end_delim = false;
          } else if (last_type === 'TK_OPERATOR') {
            start_delim = false;
            end_delim = false;
          } else if (last_type === 'TK_END_EXPR') {
            start_delim = true;
            end_delim = true;
          } else if (token_text === '.') {
            // decimal digits or object.property
            start_delim = false;
            end_delim = false;
          } else if (token_text === ':') {
            if (flags.mode === '(EXPR)' || flags.mode === '[EXPR]') {
              // [key:value]
              // fn(x:10, y:20, z:30)
            } else {
              // function return values
              start_delim = false;
            }
          }
          
          if (start_delim) {
            print_single_space();
          }
          
          print_token();
          
          if (end_delim) {
            print_single_space();
          }
          break;
          
        case 'TK_COMMA':
          print_token();
          print_single_space();
          break;
          
        case 'TK_DOT':
          print_token();
          break;
          
        case 'TK_COMMENT':
          print_token();
          print_newline();
          break;
          
        default:
          // do nothing
          print_token();
          break;
      }
      
      last_last_type = last_type;
      last_type = token_type;
      last_last_text = last_text;
      last_text = token_text;
    }
    
    return output.join('');
  }
  
  // Export beautifier function
  if (typeof window !== 'undefined') {
    window.js_beautify = js_beautify;
  }
  
  return js_beautify;
})();