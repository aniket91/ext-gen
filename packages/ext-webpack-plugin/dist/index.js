'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require('@babel/polyfill');

class ExtWebpackPlugin {
  constructor(options) {
    var data = require(`./pluginUtil`)._constructor(options);

    this.plugin = data.plugin;
  }

  apply(compiler) {
    if (compiler.hooks) {
      if (this.plugin.vars.framework == 'extjs') {
        compiler.hooks.afterCompile.tap('ext-after-compile', compilation => {
          require(`./extjsUtil`)._afterCompile(compilation, this.plugin.vars, this.plugin.options);
        });
      } else {
        compiler.hooks.compilation.tap(`ext-compilation`, compilation => {
          require(`./pluginUtil`)._compile(compilation, this.plugin.vars, this.plugin.options);
        });
      }

      if (this.plugin.vars.pluginErrors.length == 0) {
        compiler.hooks.emit.tapAsync(`ext-emit`, (compilation, callback) => {
          require(`./pluginUtil`).emit(compiler, compilation, this.plugin.vars, this.plugin.options, callback);
        });
        compiler.hooks.done.tap(`ext-done`, () => {
          require('./pluginUtil').log(this.plugin.vars.app + `Completed ext-webpack-plugin processing`);
        });
      }
    } else {
      console.log('not webpack 4');
    }
  }

}

exports.default = ExtWebpackPlugin;
module.exports = exports["default"];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJyZXF1aXJlIiwiRXh0V2VicGFja1BsdWdpbiIsImNvbnN0cnVjdG9yIiwib3B0aW9ucyIsImRhdGEiLCJfY29uc3RydWN0b3IiLCJwbHVnaW4iLCJhcHBseSIsImNvbXBpbGVyIiwiaG9va3MiLCJ2YXJzIiwiZnJhbWV3b3JrIiwiYWZ0ZXJDb21waWxlIiwidGFwIiwiY29tcGlsYXRpb24iLCJfYWZ0ZXJDb21waWxlIiwiX2NvbXBpbGUiLCJwbHVnaW5FcnJvcnMiLCJsZW5ndGgiLCJlbWl0IiwidGFwQXN5bmMiLCJjYWxsYmFjayIsImRvbmUiLCJsb2ciLCJhcHAiLCJjb25zb2xlIl0sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7OztBQUNBQSxPQUFPLENBQUMsaUJBQUQsQ0FBUDs7QUFFZSxNQUFNQyxnQkFBTixDQUF1QjtBQUVwQ0MsRUFBQUEsV0FBVyxDQUFDQyxPQUFELEVBQVU7QUFFbkIsUUFBSUMsSUFBSSxHQUFHSixPQUFPLENBQUUsY0FBRixDQUFQLENBQXdCSyxZQUF4QixDQUFxQ0YsT0FBckMsQ0FBWDs7QUFDQSxTQUFLRyxNQUFMLEdBQWNGLElBQUksQ0FBQ0UsTUFBbkI7QUFFRDs7QUFFREMsRUFBQUEsS0FBSyxDQUFDQyxRQUFELEVBQVc7QUFDZCxRQUFJQSxRQUFRLENBQUNDLEtBQWIsRUFBb0I7QUFDbEIsVUFBSyxLQUFLSCxNQUFMLENBQVlJLElBQVosQ0FBaUJDLFNBQWpCLElBQThCLE9BQW5DLEVBQTRDO0FBQzFDSCxRQUFBQSxRQUFRLENBQUNDLEtBQVQsQ0FBZUcsWUFBZixDQUE0QkMsR0FBNUIsQ0FBZ0MsbUJBQWhDLEVBQXNEQyxXQUFELElBQWlCO0FBQ3BFZCxVQUFBQSxPQUFPLENBQUUsYUFBRixDQUFQLENBQXVCZSxhQUF2QixDQUFxQ0QsV0FBckMsRUFBa0QsS0FBS1IsTUFBTCxDQUFZSSxJQUE5RCxFQUFvRSxLQUFLSixNQUFMLENBQVlILE9BQWhGO0FBQ0QsU0FGRDtBQUdELE9BSkQsTUFLSztBQUNISyxRQUFBQSxRQUFRLENBQUNDLEtBQVQsQ0FBZUssV0FBZixDQUEyQkQsR0FBM0IsQ0FBZ0MsaUJBQWhDLEVBQW1EQyxXQUFELElBQWlCO0FBQ2pFZCxVQUFBQSxPQUFPLENBQUUsY0FBRixDQUFQLENBQXdCZ0IsUUFBeEIsQ0FBaUNGLFdBQWpDLEVBQThDLEtBQUtSLE1BQUwsQ0FBWUksSUFBMUQsRUFBZ0UsS0FBS0osTUFBTCxDQUFZSCxPQUE1RTtBQUNELFNBRkQ7QUFHRDs7QUFFRCxVQUFJLEtBQUtHLE1BQUwsQ0FBWUksSUFBWixDQUFpQk8sWUFBakIsQ0FBOEJDLE1BQTlCLElBQXdDLENBQTVDLEVBQStDO0FBQzdDVixRQUFBQSxRQUFRLENBQUNDLEtBQVQsQ0FBZVUsSUFBZixDQUFvQkMsUUFBcEIsQ0FBOEIsVUFBOUIsRUFBeUMsQ0FBQ04sV0FBRCxFQUFjTyxRQUFkLEtBQTJCO0FBQ2xFckIsVUFBQUEsT0FBTyxDQUFFLGNBQUYsQ0FBUCxDQUF3Qm1CLElBQXhCLENBQTZCWCxRQUE3QixFQUF1Q00sV0FBdkMsRUFBb0QsS0FBS1IsTUFBTCxDQUFZSSxJQUFoRSxFQUFzRSxLQUFLSixNQUFMLENBQVlILE9BQWxGLEVBQTJGa0IsUUFBM0Y7QUFDRCxTQUZEO0FBSUFiLFFBQUFBLFFBQVEsQ0FBQ0MsS0FBVCxDQUFlYSxJQUFmLENBQW9CVCxHQUFwQixDQUF5QixVQUF6QixFQUFvQyxNQUFNO0FBQ3hDYixVQUFBQSxPQUFPLENBQUMsY0FBRCxDQUFQLENBQXdCdUIsR0FBeEIsQ0FBNEIsS0FBS2pCLE1BQUwsQ0FBWUksSUFBWixDQUFpQmMsR0FBakIsR0FBd0IseUNBQXBEO0FBQ0QsU0FGRDtBQUdEO0FBRUYsS0F0QkQsTUF1Qks7QUFBQ0MsTUFBQUEsT0FBTyxDQUFDRixHQUFSLENBQVksZUFBWjtBQUE2QjtBQUNwQzs7QUFsQ21DIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnXG5yZXF1aXJlKCdAYmFiZWwvcG9seWZpbGwnKVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFeHRXZWJwYWNrUGx1Z2luIHtcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG5cbiAgICB2YXIgZGF0YSA9IHJlcXVpcmUoYC4vcGx1Z2luVXRpbGApLl9jb25zdHJ1Y3RvcihvcHRpb25zKVxuICAgIHRoaXMucGx1Z2luID0gZGF0YS5wbHVnaW5cblxuICB9XG5cbiAgYXBwbHkoY29tcGlsZXIpIHtcbiAgICBpZiAoY29tcGlsZXIuaG9va3MpIHtcbiAgICAgIGlmICggdGhpcy5wbHVnaW4udmFycy5mcmFtZXdvcmsgPT0gJ2V4dGpzJykge1xuICAgICAgICBjb21waWxlci5ob29rcy5hZnRlckNvbXBpbGUudGFwKCdleHQtYWZ0ZXItY29tcGlsZScsIChjb21waWxhdGlvbikgPT4ge1xuICAgICAgICAgIHJlcXVpcmUoYC4vZXh0anNVdGlsYCkuX2FmdGVyQ29tcGlsZShjb21waWxhdGlvbiwgdGhpcy5wbHVnaW4udmFycywgdGhpcy5wbHVnaW4ub3B0aW9ucylcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBjb21waWxlci5ob29rcy5jb21waWxhdGlvbi50YXAoYGV4dC1jb21waWxhdGlvbmAsIChjb21waWxhdGlvbikgPT4ge1xuICAgICAgICAgIHJlcXVpcmUoYC4vcGx1Z2luVXRpbGApLl9jb21waWxlKGNvbXBpbGF0aW9uLCB0aGlzLnBsdWdpbi52YXJzLCB0aGlzLnBsdWdpbi5vcHRpb25zKVxuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5wbHVnaW4udmFycy5wbHVnaW5FcnJvcnMubGVuZ3RoID09IDApIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXBBc3luYyhgZXh0LWVtaXRgLCAoY29tcGlsYXRpb24sIGNhbGxiYWNrKSA9PiB7XG4gICAgICAgICAgcmVxdWlyZShgLi9wbHVnaW5VdGlsYCkuZW1pdChjb21waWxlciwgY29tcGlsYXRpb24sIHRoaXMucGx1Z2luLnZhcnMsIHRoaXMucGx1Z2luLm9wdGlvbnMsIGNhbGxiYWNrKVxuICAgICAgICB9KVxuXG4gICAgICAgIGNvbXBpbGVyLmhvb2tzLmRvbmUudGFwKGBleHQtZG9uZWAsICgpID0+IHtcbiAgICAgICAgICByZXF1aXJlKCcuL3BsdWdpblV0aWwnKS5sb2codGhpcy5wbHVnaW4udmFycy5hcHAgKyBgQ29tcGxldGVkIGV4dC13ZWJwYWNrLXBsdWdpbiBwcm9jZXNzaW5nYClcbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgIH1cbiAgICBlbHNlIHtjb25zb2xlLmxvZygnbm90IHdlYnBhY2sgNCcpfVxuICB9XG5cbn1cblxuIl19