"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDefaultOptions = getDefaultOptions;
exports.getDefaultVars = getDefaultVars;
exports._afterCompile = _afterCompile;
exports._prepareForBuild = _prepareForBuild;
exports.extractFromSource = extractFromSource;

function getDefaultOptions() {
  return {
    port: 1962,
    profile: 'desktop',
    environment: 'development',
    verbose: 'no'
  };
}

function getDefaultVars() {
  return {
    firstTime: true,
    browserCount: 0,
    cwd: process.cwd(),
    output: '.',
    lastNumFiles: 0,
    lastMilliseconds: 0,
    lastMillisecondsAppJson: 0,
    files: ['./app.json'],
    dirs: ['./app', './packages']
  };
}

function _afterCompile(compilation, vars, options) {
  var app = vars.app;

  const log = require('./pluginUtil').log;

  log(app + 'ext-after-compile');

  if (options.verbose == 'yes') {
    log('-v-' + app + 'verbose');
  }

  const path = require('path');

  let {
    files,
    dirs
  } = vars;
  const {
    cwd
  } = vars;
  files = typeof files === 'string' ? [files] : files;
  dirs = typeof dirs === 'string' ? [dirs] : dirs;

  const {
    fileDependencies,
    contextDependencies
  } = _getFileAndContextDeps(compilation, files, dirs, cwd);

  if (files.length > 0) {
    fileDependencies.forEach(file => {
      compilation.fileDependencies.add(path.resolve(file));
    });
  }

  if (dirs.length > 0) {
    contextDependencies.forEach(context => {
      compilation.contextDependencies.add(context);
    });
  }
}

function _getFileAndContextDeps(compilation, files, dirs, cwd) {
  const log = require('./pluginUtil').log;

  const uniq = require('lodash.uniq');

  const isGlob = require('is-glob');

  const {
    fileDependencies,
    contextDependencies
  } = compilation;
  const isWebpack4 = compilation.hooks;
  let fds = isWebpack4 ? [...fileDependencies] : fileDependencies;
  let cds = isWebpack4 ? [...contextDependencies] : contextDependencies;

  if (files.length > 0) {
    files.forEach(pattern => {
      let f = pattern;

      if (isGlob(pattern)) {
        f = glob.sync(pattern, {
          cwd,
          dot: true,
          absolute: true
        });
      }

      fds = fds.concat(f);
    });
    fds = uniq(fds);
  }

  if (dirs.length > 0) {
    cds = uniq(cds.concat(dirs));
  }

  return {
    fileDependencies: fds,
    contextDependencies: cds
  };
}

function _prepareForBuild(app, vars, options, output, compilation) {
  const log = require('./pluginUtil').log;

  if (options.verbose == 'yes') {
    log('-v-' + app + '_prepareForBuild');
  }

  const fs = require('fs');

  const recursiveReadSync = require('recursive-readdir-sync');

  var watchedFiles = [];

  try {
    watchedFiles = recursiveReadSync('./app').concat(recursiveReadSync('./packages'));
  } catch (err) {
    if (err.errno === 34) {
      console.log('Path does not exist');
    } else {
      throw err;
    }
  }

  var currentNumFiles = watchedFiles.length;

  if (options.verbose == 'yes') {
    log('-v-' + app + 'watchedFiles: ' + currentNumFiles);
  }

  var doBuild = false;

  for (var file in watchedFiles) {
    if (vars.lastMilliseconds < fs.statSync(watchedFiles[file]).mtimeMs) {
      if (watchedFiles[file].indexOf("scss") != -1) {
        doBuild = true;
        break;
      }
    }
  }

  if (vars.lastMilliseconds < fs.statSync('./app.json').mtimeMs) {
    doBuild = true;
  }

  if (options.verbose == 'yes') {
    log('-v-' + app + 'doBuild: ' + doBuild);
  }

  vars.lastMilliseconds = new Date().getTime();
  var filesource = 'this file enables client reload';
  compilation.assets[currentNumFiles + 'FilesUnderAppFolder.md'] = {
    source: function () {
      return filesource;
    },
    size: function () {
      return filesource.length;
    }
  };

  if (options.verbose == 'yes') {
    log('-v-' + app + 'currentNumFiles: ' + currentNumFiles);
  }

  if (options.verbose == 'yes') {
    log('-v-' + app + 'vars.lastNumFiles: ' + vars.lastNumFiles);
  }

  if (options.verbose == 'yes') {
    log('-v-' + app + 'doBuild: ' + doBuild);
  }

  if (currentNumFiles != vars.lastNumFiles || doBuild) {
    vars.rebuild = true;
    log(app + 'building ExtReact bundle at: ' + output.replace(process.cwd(), ''));
  } else {
    vars.rebuild = false;
  }

  vars.lastNumFiles = currentNumFiles;
}

function toXtype(str) {
  return str.toLowerCase().replace(/_/g, '-');
}

function extractFromSource(js) {
  const log = require('./pluginUtil').log;

  var generate = require("@babel/generator").default;

  var parse = require("babylon").parse;

  var traverse = require("ast-traverse");

  const statements = [];
  const ast = parse(js, {
    plugins: ['jsx', 'flow', 'doExpressions', 'objectRestSpread', 'classProperties', 'exportExtensions', 'asyncGenerators', 'functionBind', 'functionSent', 'dynamicImport'],
    sourceType: 'module'
  });

  function addType(argNode) {
    var type;

    if (argNode.type === 'StringLiteral') {
      var xtype = toXtype(argNode.value);

      if (xtype != 'extreact') {
        type = {
          xtype: toXtype(argNode.value)
        };
      }
    } else {
      type = {
        xclass: js.slice(argNode.start, argNode.end)
      };
    }

    if (type != undefined) {
      let config = JSON.stringify(type);
      statements.push(`Ext.create(${config})`);
    }
  }

  traverse(ast, {
    pre: function (node) {
      if (node.type === 'CallExpression' && node.callee && node.callee.object && node.callee.object.name === 'Ext') {
        statements.push(generate(node).code);
      }

      if (node.type == 'VariableDeclarator' && node.init && node.init.type === 'CallExpression' && node.init.callee) {
        if (node.init.callee.name == 'reactify') {
          for (let i = 0; i < node.init.arguments.length; i++) {
            const valueNode = node.init.arguments[i];
            if (!valueNode) continue;
            addType(valueNode);
          }
        }
      } // // Convert React.createElement(...) calls to the equivalent Ext.create(...) calls to put in the manifest.
      // if (node.type === 'CallExpressionx' 
      //     && node.callee.object 
      //     && node.callee.object.name === 'React' 
      //     && node.callee.property.name === 'createElement') {
      //   const [props] = node.arguments
      //   let config
      //   if (Array.isArray(props.properties)) {
      //     config = generate(props).code
      //     for (let key in type) {
      //       config = `{\n  ${key}: '${type[key]}',${config.slice(1)}`
      //     }
      //   } else {
      //     config = JSON.stringify(type)
      //   }
      // }

    }
  });
  return statements;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9leHRqc1V0aWwuanMiXSwibmFtZXMiOlsiZ2V0RGVmYXVsdE9wdGlvbnMiLCJwb3J0IiwicHJvZmlsZSIsImVudmlyb25tZW50IiwidmVyYm9zZSIsImdldERlZmF1bHRWYXJzIiwiZmlyc3RUaW1lIiwiYnJvd3NlckNvdW50IiwiY3dkIiwicHJvY2VzcyIsIm91dHB1dCIsImxhc3ROdW1GaWxlcyIsImxhc3RNaWxsaXNlY29uZHMiLCJsYXN0TWlsbGlzZWNvbmRzQXBwSnNvbiIsImZpbGVzIiwiZGlycyIsIl9hZnRlckNvbXBpbGUiLCJjb21waWxhdGlvbiIsInZhcnMiLCJvcHRpb25zIiwiYXBwIiwibG9nIiwicmVxdWlyZSIsInBhdGgiLCJmaWxlRGVwZW5kZW5jaWVzIiwiY29udGV4dERlcGVuZGVuY2llcyIsIl9nZXRGaWxlQW5kQ29udGV4dERlcHMiLCJsZW5ndGgiLCJmb3JFYWNoIiwiZmlsZSIsImFkZCIsInJlc29sdmUiLCJjb250ZXh0IiwidW5pcSIsImlzR2xvYiIsImlzV2VicGFjazQiLCJob29rcyIsImZkcyIsImNkcyIsInBhdHRlcm4iLCJmIiwiZ2xvYiIsInN5bmMiLCJkb3QiLCJhYnNvbHV0ZSIsImNvbmNhdCIsIl9wcmVwYXJlRm9yQnVpbGQiLCJmcyIsInJlY3Vyc2l2ZVJlYWRTeW5jIiwid2F0Y2hlZEZpbGVzIiwiZXJyIiwiZXJybm8iLCJjb25zb2xlIiwiY3VycmVudE51bUZpbGVzIiwiZG9CdWlsZCIsInN0YXRTeW5jIiwibXRpbWVNcyIsImluZGV4T2YiLCJEYXRlIiwiZ2V0VGltZSIsImZpbGVzb3VyY2UiLCJhc3NldHMiLCJzb3VyY2UiLCJzaXplIiwicmVidWlsZCIsInJlcGxhY2UiLCJ0b1h0eXBlIiwic3RyIiwidG9Mb3dlckNhc2UiLCJleHRyYWN0RnJvbVNvdXJjZSIsImpzIiwiZ2VuZXJhdGUiLCJkZWZhdWx0IiwicGFyc2UiLCJ0cmF2ZXJzZSIsInN0YXRlbWVudHMiLCJhc3QiLCJwbHVnaW5zIiwic291cmNlVHlwZSIsImFkZFR5cGUiLCJhcmdOb2RlIiwidHlwZSIsInh0eXBlIiwidmFsdWUiLCJ4Y2xhc3MiLCJzbGljZSIsInN0YXJ0IiwiZW5kIiwidW5kZWZpbmVkIiwiY29uZmlnIiwiSlNPTiIsInN0cmluZ2lmeSIsInB1c2giLCJwcmUiLCJub2RlIiwiY2FsbGVlIiwib2JqZWN0IiwibmFtZSIsImNvZGUiLCJpbml0IiwiaSIsImFyZ3VtZW50cyIsInZhbHVlTm9kZSJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7O0FBRU8sU0FBU0EsaUJBQVQsR0FBNkI7QUFDbEMsU0FBTztBQUNMQyxJQUFBQSxJQUFJLEVBQUUsSUFERDtBQUVMQyxJQUFBQSxPQUFPLEVBQUUsU0FGSjtBQUdMQyxJQUFBQSxXQUFXLEVBQUUsYUFIUjtBQUlMQyxJQUFBQSxPQUFPLEVBQUU7QUFKSixHQUFQO0FBT0Q7O0FBRU0sU0FBU0MsY0FBVCxHQUEwQjtBQUMvQixTQUFPO0FBQ0xDLElBQUFBLFNBQVMsRUFBRyxJQURQO0FBRUxDLElBQUFBLFlBQVksRUFBRyxDQUZWO0FBR0xDLElBQUFBLEdBQUcsRUFBRUMsT0FBTyxDQUFDRCxHQUFSLEVBSEE7QUFJTEUsSUFBQUEsTUFBTSxFQUFFLEdBSkg7QUFLTEMsSUFBQUEsWUFBWSxFQUFFLENBTFQ7QUFNTEMsSUFBQUEsZ0JBQWdCLEVBQUUsQ0FOYjtBQU9MQyxJQUFBQSx1QkFBdUIsRUFBRSxDQVBwQjtBQVFMQyxJQUFBQSxLQUFLLEVBQUUsQ0FBQyxZQUFELENBUkY7QUFTTEMsSUFBQUEsSUFBSSxFQUFFLENBQUMsT0FBRCxFQUFTLFlBQVQ7QUFURCxHQUFQO0FBV0Q7O0FBRU0sU0FBU0MsYUFBVCxDQUF1QkMsV0FBdkIsRUFBb0NDLElBQXBDLEVBQTBDQyxPQUExQyxFQUFtRDtBQUN4RCxNQUFJQyxHQUFHLEdBQUdGLElBQUksQ0FBQ0UsR0FBZjs7QUFDQSxRQUFNQyxHQUFHLEdBQUdDLE9BQU8sQ0FBQyxjQUFELENBQVAsQ0FBd0JELEdBQXBDOztBQUNBQSxFQUFB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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNEO0FBdkNXLEdBQU4sQ0FBUjtBQXlDQSxTQUFPM0IsVUFBUDtBQUNEIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCJcblxuZXhwb3J0IGZ1bmN0aW9uIGdldERlZmF1bHRPcHRpb25zKCkge1xuICByZXR1cm4ge1xuICAgIHBvcnQ6IDE5NjIsXG4gICAgcHJvZmlsZTogJ2Rlc2t0b3AnLCBcbiAgICBlbnZpcm9ubWVudDogJ2RldmVsb3BtZW50JywgXG4gICAgdmVyYm9zZTogJ25vJyxcblxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXREZWZhdWx0VmFycygpIHtcbiAgcmV0dXJuIHtcbiAgICBmaXJzdFRpbWUgOiB0cnVlLFxuICAgIGJyb3dzZXJDb3VudCA6IDAsXG4gICAgY3dkOiBwcm9jZXNzLmN3ZCgpLFxuICAgIG91dHB1dDogJy4nLFxuICAgIGxhc3ROdW1GaWxlczogMCxcbiAgICBsYXN0TWlsbGlzZWNvbmRzOiAwLFxuICAgIGxhc3RNaWxsaXNlY29uZHNBcHBKc29uOiAwLFxuICAgIGZpbGVzOiBbJy4vYXBwLmpzb24nXSxcbiAgICBkaXJzOiBbJy4vYXBwJywnLi9wYWNrYWdlcyddXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9hZnRlckNvbXBpbGUoY29tcGlsYXRpb24sIHZhcnMsIG9wdGlvbnMpIHtcbiAgdmFyIGFwcCA9IHZhcnMuYXBwXG4gIGNvbnN0IGxvZyA9IHJlcXVpcmUoJy4vcGx1Z2luVXRpbCcpLmxvZ1xuICBsb2coYXBwICsgJ2V4dC1hZnRlci1jb21waWxlJylcbiAgaWYob3B0aW9ucy52ZXJib3NlID09ICd5ZXMnKSB7bG9nKCctdi0nICsgYXBwICsgJ3ZlcmJvc2UnKX1cbiAgY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKVxuICBsZXQgeyBmaWxlcywgZGlycyB9ID0gdmFyc1xuICBjb25zdCB7IGN3ZCB9ID0gdmFyc1xuICBmaWxlcyA9IHR5cGVvZiBmaWxlcyA9PT0gJ3N0cmluZycgPyBbZmlsZXNdIDogZmlsZXNcbiAgZGlycyA9IHR5cGVvZiBkaXJzID09PSAnc3RyaW5nJyA/IFtkaXJzXSA6IGRpcnNcbiAgY29uc3Qge1xuICAgIGZpbGVEZXBlbmRlbmNpZXMsXG4gICAgY29udGV4dERlcGVuZGVuY2llcyxcbiAgfSA9IF9nZXRGaWxlQW5kQ29udGV4dERlcHMoY29tcGlsYXRpb24sIGZpbGVzLCBkaXJzLCBjd2QpO1xuICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAgIGZpbGVEZXBlbmRlbmNpZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgY29tcGlsYXRpb24uZmlsZURlcGVuZGVuY2llcy5hZGQocGF0aC5yZXNvbHZlKGZpbGUpKTtcbiAgICB9KVxuICB9XG4gIGlmIChkaXJzLmxlbmd0aCA+IDApIHtcbiAgICBjb250ZXh0RGVwZW5kZW5jaWVzLmZvckVhY2goKGNvbnRleHQpID0+IHtcbiAgICAgIGNvbXBpbGF0aW9uLmNvbnRleHREZXBlbmRlbmNpZXMuYWRkKGNvbnRleHQpO1xuICAgIH0pXG4gIH1cbn1cblxuXG5mdW5jdGlvbiBfZ2V0RmlsZUFuZENvbnRleHREZXBzKGNvbXBpbGF0aW9uLCBmaWxlcywgZGlycywgY3dkKSB7XG4gIGNvbnN0IGxvZyA9IHJlcXVpcmUoJy4vcGx1Z2luVXRpbCcpLmxvZ1xuICBjb25zdCB1bmlxID0gcmVxdWlyZSgnbG9kYXNoLnVuaXEnKVxuICBjb25zdCBpc0dsb2IgPSByZXF1aXJlKCdpcy1nbG9iJylcblxuICBjb25zdCB7IGZpbGVEZXBlbmRlbmNpZXMsIGNvbnRleHREZXBlbmRlbmNpZXMgfSA9IGNvbXBpbGF0aW9uO1xuICBjb25zdCBpc1dlYnBhY2s0ID0gY29tcGlsYXRpb24uaG9va3M7XG4gIGxldCBmZHMgPSBpc1dlYnBhY2s0ID8gWy4uLmZpbGVEZXBlbmRlbmNpZXNdIDogZmlsZURlcGVuZGVuY2llcztcbiAgbGV0IGNkcyA9IGlzV2VicGFjazQgPyBbLi4uY29udGV4dERlcGVuZGVuY2llc10gOiBjb250ZXh0RGVwZW5kZW5jaWVzO1xuICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAgIGZpbGVzLmZvckVhY2goKHBhdHRlcm4pID0+IHtcbiAgICAgIGxldCBmID0gcGF0dGVyblxuICAgICAgaWYgKGlzR2xvYihwYXR0ZXJuKSkge1xuICAgICAgICBmID0gZ2xvYi5zeW5jKHBhdHRlcm4sIHsgY3dkLCBkb3Q6IHRydWUsIGFic29sdXRlOiB0cnVlIH0pXG4gICAgICB9XG4gICAgICBmZHMgPSBmZHMuY29uY2F0KGYpXG4gICAgfSlcbiAgICBmZHMgPSB1bmlxKGZkcylcbiAgfVxuICBpZiAoZGlycy5sZW5ndGggPiAwKSB7XG4gICAgY2RzID0gdW5pcShjZHMuY29uY2F0KGRpcnMpKVxuICB9XG4gIHJldHVybiB7IGZpbGVEZXBlbmRlbmNpZXM6IGZkcywgY29udGV4dERlcGVuZGVuY2llczogY2RzIH1cbn1cblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBfcHJlcGFyZUZvckJ1aWxkKGFwcCwgdmFycywgb3B0aW9ucywgb3V0cHV0LCBjb21waWxhdGlvbikge1xuICBjb25zdCBsb2cgPSByZXF1aXJlKCcuL3BsdWdpblV0aWwnKS5sb2dcbiAgaWYob3B0aW9ucy52ZXJib3NlID09ICd5ZXMnKSB7bG9nKCctdi0nICsgYXBwICsgJ19wcmVwYXJlRm9yQnVpbGQnKX1cbiAgY29uc3QgZnMgPSByZXF1aXJlKCdmcycpXG4gIGNvbnN0IHJlY3Vyc2l2ZVJlYWRTeW5jID0gcmVxdWlyZSgncmVjdXJzaXZlLXJlYWRkaXItc3luYycpXG4gIHZhciB3YXRjaGVkRmlsZXM9W11cbiAgdHJ5IHt3YXRjaGVkRmlsZXMgPSByZWN1cnNpdmVSZWFkU3luYygnLi9hcHAnKS5jb25jYXQocmVjdXJzaXZlUmVhZFN5bmMoJy4vcGFja2FnZXMnKSl9XG4gIGNhdGNoKGVycikge2lmKGVyci5lcnJubyA9PT0gMzQpe2NvbnNvbGUubG9nKCdQYXRoIGRvZXMgbm90IGV4aXN0Jyk7fSBlbHNlIHt0aHJvdyBlcnI7fX1cbiAgdmFyIGN1cnJlbnROdW1GaWxlcyA9IHdhdGNoZWRGaWxlcy5sZW5ndGhcbiAgaWYgKG9wdGlvbnMudmVyYm9zZSA9PSAneWVzJykge2xvZygnLXYtJyArIGFwcCArICd3YXRjaGVkRmlsZXM6ICcgKyBjdXJyZW50TnVtRmlsZXMpfVxuICB2YXIgZG9CdWlsZCA9IGZhbHNlXG4gIGZvciAodmFyIGZpbGUgaW4gd2F0Y2hlZEZpbGVzKSB7XG4gICAgaWYgKHZhcnMubGFzdE1pbGxpc2Vjb25kcyA8IGZzLnN0YXRTeW5jKHdhdGNoZWRGaWxlc1tmaWxlXSkubXRpbWVNcykge1xuICAgICAgaWYgKHdhdGNoZWRGaWxlc1tmaWxlXS5pbmRleE9mKFwic2Nzc1wiKSAhPSAtMSkge2RvQnVpbGQ9dHJ1ZTticmVhazt9XG4gICAgfVxuICB9XG4gIGlmICh2YXJzLmxhc3RNaWxsaXNlY29uZHMgPCBmcy5zdGF0U3luYygnLi9hcHAuanNvbicpLm10aW1lTXMpIHtcbiAgICBkb0J1aWxkPXRydWVcbiAgfVxuICBpZihvcHRpb25zLnZlcmJvc2UgPT0gJ3llcycpIHtsb2coJy12LScgKyBhcHAgKyAnZG9CdWlsZDogJyArIGRvQnVpbGQpfVxuXG4gIHZhcnMubGFzdE1pbGxpc2Vjb25kcyA9IChuZXcgRGF0ZSkuZ2V0VGltZSgpXG4gIHZhciBmaWxlc291cmNlID0gJ3RoaXMgZmlsZSBlbmFibGVzIGNsaWVudCByZWxvYWQnXG4gIGNvbXBpbGF0aW9uLmFzc2V0c1tjdXJyZW50TnVtRmlsZXMgKyAnRmlsZXNVbmRlckFwcEZvbGRlci5tZCddID0ge1xuICAgIHNvdXJjZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVzb3VyY2V9LFxuICAgIHNpemU6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlc291cmNlLmxlbmd0aH1cbiAgfVxuXG4gIGlmKG9wdGlvbnMudmVyYm9zZSA9PSAneWVzJykge2xvZygnLXYtJyArIGFwcCArICdjdXJyZW50TnVtRmlsZXM6ICcgKyBjdXJyZW50TnVtRmlsZXMpfVxuICBpZihvcHRpb25zLnZlcmJvc2UgPT0gJ3llcycpIHtsb2coJy12LScgKyBhcHAgKyAndmFycy5sYXN0TnVtRmlsZXM6ICcgKyB2YXJzLmxhc3ROdW1GaWxlcyl9XG4gIGlmKG9wdGlvbnMudmVyYm9zZSA9PSAneWVzJykge2xvZygnLXYtJyArIGFwcCArICdkb0J1aWxkOiAnICsgZG9CdWlsZCl9XG5cbiAgaWYgKGN1cnJlbnROdW1GaWxlcyAhPSB2YXJzLmxhc3ROdW1GaWxlcyB8fCBkb0J1aWxkKSB7XG4gICAgdmFycy5yZWJ1aWxkID0gdHJ1ZVxuICAgIGxvZyhhcHAgKyAnYnVpbGRpbmcgRXh0UmVhY3QgYnVuZGxlIGF0OiAnICsgb3V0cHV0LnJlcGxhY2UocHJvY2Vzcy5jd2QoKSwgJycpKVxuICB9XG4gIGVsc2Uge1xuICAgIHZhcnMucmVidWlsZCA9IGZhbHNlXG4gIH1cbiAgdmFycy5sYXN0TnVtRmlsZXMgPSBjdXJyZW50TnVtRmlsZXNcbn1cblxuXG5cbmZ1bmN0aW9uIHRvWHR5cGUoc3RyKSB7XG4gIHJldHVybiBzdHIudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9fL2csICctJylcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RGcm9tU291cmNlKGpzKSB7XG4gIGNvbnN0IGxvZyA9IHJlcXVpcmUoJy4vcGx1Z2luVXRpbCcpLmxvZ1xuICB2YXIgZ2VuZXJhdGUgPSByZXF1aXJlKFwiQGJhYmVsL2dlbmVyYXRvclwiKS5kZWZhdWx0XG4gIHZhciBwYXJzZSA9IHJlcXVpcmUoXCJiYWJ5bG9uXCIpLnBhcnNlXG4gIHZhciB0cmF2ZXJzZSA9IHJlcXVpcmUoXCJhc3QtdHJhdmVyc2VcIilcbiAgY29uc3Qgc3RhdGVtZW50cyA9IFtdXG4gIFxuICBjb25zdCBhc3QgPSBwYXJzZShqcywge1xuICAgIHBsdWdpbnM6IFtcbiAgICAgICdqc3gnLFxuICAgICAgJ2Zsb3cnLFxuICAgICAgJ2RvRXhwcmVzc2lvbnMnLFxuICAgICAgJ29iamVjdFJlc3RTcHJlYWQnLFxuICAgICAgJ2NsYXNzUHJvcGVydGllcycsXG4gICAgICAnZXhwb3J0RXh0ZW5zaW9ucycsXG4gICAgICAnYXN5bmNHZW5lcmF0b3JzJyxcbiAgICAgICdmdW5jdGlvbkJpbmQnLFxuICAgICAgJ2Z1bmN0aW9uU2VudCcsXG4gICAgICAnZHluYW1pY0ltcG9ydCdcbiAgICBdLFxuICAgIHNvdXJjZVR5cGU6ICdtb2R1bGUnXG4gIH0pXG5cbiAgZnVuY3Rpb24gYWRkVHlwZShhcmdOb2RlKSB7XG4gICAgdmFyIHR5cGVcbiAgICBpZiAoYXJnTm9kZS50eXBlID09PSAnU3RyaW5nTGl0ZXJhbCcpIHtcbiAgICAgIHZhciB4dHlwZSA9IHRvWHR5cGUoYXJnTm9kZS52YWx1ZSlcbiAgICAgIGlmICh4dHlwZSAhPSAnZXh0cmVhY3QnKSB7XG4gICAgICAgIHR5cGUgPSB7IHh0eXBlOiB0b1h0eXBlKGFyZ05vZGUudmFsdWUpIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdHlwZSA9IHsgeGNsYXNzOiBqcy5zbGljZShhcmdOb2RlLnN0YXJ0LCBhcmdOb2RlLmVuZCkgfVxuICAgIH1cbiAgICBpZiAodHlwZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgIGxldCBjb25maWcgPSBKU09OLnN0cmluZ2lmeSh0eXBlKVxuICAgICAgc3RhdGVtZW50cy5wdXNoKGBFeHQuY3JlYXRlKCR7Y29uZmlnfSlgKVxuICAgIH1cbiAgfVxuXG4gIHRyYXZlcnNlKGFzdCwge1xuICAgIHByZTogZnVuY3Rpb24obm9kZSkge1xuICAgICAgaWYgKG5vZGUudHlwZSA9PT0gJ0NhbGxFeHByZXNzaW9uJ1xuICAgICAgICAgICYmIG5vZGUuY2FsbGVlXG4gICAgICAgICAgJiYgbm9kZS5jYWxsZWUub2JqZWN0XG4gICAgICAgICAgJiYgbm9kZS5jYWxsZWUub2JqZWN0Lm5hbWUgPT09ICdFeHQnXG4gICAgICApIHtcbiAgICAgICAgc3RhdGVtZW50cy5wdXNoKGdlbmVyYXRlKG5vZGUpLmNvZGUpXG4gICAgICB9XG4gICAgICBpZiAobm9kZS50eXBlID09ICdWYXJpYWJsZURlY2xhcmF0b3InIFxuICAgICAgICAgICYmIG5vZGUuaW5pdCBcbiAgICAgICAgICAmJiBub2RlLmluaXQudHlwZSA9PT0gJ0NhbGxFeHByZXNzaW9uJyBcbiAgICAgICAgICAmJiBub2RlLmluaXQuY2FsbGVlIFxuICAgICAgKSB7XG4gICAgICAgIGlmIChub2RlLmluaXQuY2FsbGVlLm5hbWUgPT0gJ3JlYWN0aWZ5Jykge1xuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZS5pbml0LmFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgdmFsdWVOb2RlID0gbm9kZS5pbml0LmFyZ3VtZW50c1tpXTtcbiAgICAgICAgICAgIGlmICghdmFsdWVOb2RlKSBjb250aW51ZTtcbiAgICAgICAgICAgIGFkZFR5cGUodmFsdWVOb2RlKVxuICAgICAgICAgIH1cbiAgICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gLy8gQ29udmVydCBSZWFjdC5jcmVhdGVFbGVtZW50KC4uLikgY2FsbHMgdG8gdGhlIGVxdWl2YWxlbnQgRXh0LmNyZWF0ZSguLi4pIGNhbGxzIHRvIHB1dCBpbiB0aGUgbWFuaWZlc3QuXG4gICAgICAvLyBpZiAobm9kZS50eXBlID09PSAnQ2FsbEV4cHJlc3Npb254JyBcbiAgICAgIC8vICAgICAmJiBub2RlLmNhbGxlZS5vYmplY3QgXG4gICAgICAvLyAgICAgJiYgbm9kZS5jYWxsZWUub2JqZWN0Lm5hbWUgPT09ICdSZWFjdCcgXG4gICAgICAvLyAgICAgJiYgbm9kZS5jYWxsZWUucHJvcGVydHkubmFtZSA9PT0gJ2NyZWF0ZUVsZW1lbnQnKSB7XG4gICAgICAvLyAgIGNvbnN0IFtwcm9wc10gPSBub2RlLmFyZ3VtZW50c1xuICAgICAgLy8gICBsZXQgY29uZmlnXG4gICAgICAvLyAgIGlmIChBcnJheS5pc0FycmF5KHByb3BzLnByb3BlcnRpZXMpKSB7XG4gICAgICAvLyAgICAgY29uZmlnID0gZ2VuZXJhdGUocHJvcHMpLmNvZGVcbiAgICAgIC8vICAgICBmb3IgKGxldCBrZXkgaW4gdHlwZSkge1xuICAgICAgLy8gICAgICAgY29uZmlnID0gYHtcXG4gICR7a2V5fTogJyR7dHlwZVtrZXldfScsJHtjb25maWcuc2xpY2UoMSl9YFxuICAgICAgLy8gICAgIH1cbiAgICAgIC8vICAgfSBlbHNlIHtcbiAgICAgIC8vICAgICBjb25maWcgPSBKU09OLnN0cmluZ2lmeSh0eXBlKVxuICAgICAgLy8gICB9XG4gICAgICAvLyB9XG4gICAgfVxuICB9KVxuICByZXR1cm4gc3RhdGVtZW50c1xufVxuIl19