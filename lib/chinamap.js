(function($){
var defaultOptions = {
    point : {
        "radius" : 20,
        "flash-scale" : 1.5,
        "color" : "orange",
        "border-color": "orange",
        "opacity" : 1
    },
    line : {
        "color" : "orange",
        "width" : 1.2
    },
    area : {
        "color" : ["#ffffff", "orange"],
        "opacity" : 1,
        "border-color": "#000",
        "border-focus" : "orange",
        "word-color" : "#000"
    },
    tooltip : {
        style : {
            "border": "1px solid",
            "border-color": $.browser.msie ? "rgb(0, 0, 0)" : "rgba(0, 0, 0, 0.8)",
            "background-color": $.browser.msie ? "rgb(0, 0, 0)" : "rgba(0, 0, 0, 0.75)",
            "color": "white",
            "border-radius": "2px",
            "padding": "12px 8px",
            "font-size": "12px",
            "box-shadow": "3px 3px 6px 0px rgba(0,0,0,0.58)",
            "font-familiy": "宋体",
            "z-index": 1000,
            "text-align": "center",
            "visibility": "hidden",
            "position": "absolute"
        },
        format : function(id, name) {
            return name;
        }
    }
};

$.fn.chinamap = function() {
    var args = arguments,
        options = merge(args[0]),
        chinamap;
    chinamap = new Chinamap(this[0], options);
    return chinamap;
};

function Chinamap() {
    this.init.apply(this, arguments);
}
Chinamap.prototype = {
    init : function(container, options)  {
        var map = this;
        map.container = container.id;
        map.width = $(container).width();
        map.height = $(container).height();
        map.options = merge(defaultOptions, options);
        map.paper = new Raphael(map.container, map.width, map.height);
        map.paper.setViewBox(-1174.6445229087194, -1437.3577680805693, 3039.3970214233723, 2531.19589698184, true);
        map.projection = d3.geo.albers().origin([105, 30.5]).scale(4000);
        map.getAreaPath = d3.geo.path().projection(map.projection);

        map.el = {
            word : null,
            area : null,
            point: null
        };

        map.tooltip = $("<div/>").css(map.options.tooltip.style);
        $(container).append(map.tooltip);
    },
    area : function(data) {
        var map = this,
            tmp = {},
            max = null;
        data_map.features.forEach(function(d) {
            var num = typeof data[d.id] === "number" ? data[d.id] : 0;
            if (max === null || max < num) {max = num;}
            tmp[d.id] = num;
        });
        if (typeof(map.options.area.color) === "object") {
            var colors = d3.scale.linear().domain([0, max]).range(map.options.area.color);
        } else {
            var colors = function(d) {return map.options.area.color;}
        }
        if (map.el.area === null) {
            map.el.area = {};
            map.el.word = {};
            data_map.features.forEach(function(d) {
                var state = map.paper.path(map.getAreaPath(d));
                state.attr({
                    "stroke": map.options.area["border-color"],
                    "fill-opacity" : map.options.area.opacity,
                    "fill" : colors(tmp[d.id])
                }).toBack();
                state.mouseover(function(){
                    this.attr({
                        "stroke" : map.options.area["border-focus"]
                    });
                    map.showTip(d.properties.name);
                }).mouseout(function(){
                    this.attr({
                        "stroke" : map.options.area["border-color"]
                    });
                    map.hideTip();
                }).mousemove(function(e){
                    map.moveTip(e);
                });
                map.el.area[d.id] = state;
                
                var loc = map.projection(d.properties.cp);
                map.el.word[d.id] = map.paper.text(loc[0], loc[1], d.properties.name).attr({"fill": map.options.area["word-color"]});
            });
        } else {
            data_map.features.forEach(function(d) {
                map.el.area[d.id].attr({
                    "fill" : colors(tmp[d.id])
                }).toBack();
            });
        }
        return map;
    },
    point : function(data) {
        var map = this,
            tmp = {},
            max = null;
        for (var i in data) {
            if (data_point[i] && typeof data[i] === "number") {
                var num = data[i];
                tmp[i] = num;
                if (max === null || max < num) {max = num;}
            }
        }
        var r_plus = d3.scale.linear().domain([0, max]).range([0, map.options.point.radius]),
            radius = function(num) {return r_plus(num)+15;}
        if (map.el.point == null) {
            map.el.point = {};
        }
        for (var i in tmp) {
            (function(id, num){
                var r = radius(num);
                if (map.el.point[id]) {
                    map.el.point[id].attr({
                        "r" : r
                    }).data({"or": r});
                } else {
                    var city = data_point[id];
                    var loc = map.projection(city.loc);
                    var flash_r = r * map.options.point["flash-scale"];
                    var point = map.paper.circle(loc[0], loc[1], r).attr({
                        "fill": map.options.point.color,
                        "fill-opacity": map.options.point.opacity,
                        "stroke": map.options.point["border-color"]
                    }).data({"or": r});
                    point.mouseover(function() {
                        this.attr({"r": flash_r});
                        map.showTip(city.name);
                    }).mouseout(function(){
                        this.attr({"r": r});
                        map.hideTip();
                    }).mousemove(function (e) {
                        map.moveTip(e);
                    });
                    map.el.point[i] = point;
                }
            })(i, tmp[i]);
        }
        return map;
    },
    line : function(id1, id2) {
        if (id1 == id2) {
            return false;
        }
        var map = this;
        var t = 0,
            po1 = map.projection(data_point[id1].loc),
            po2 = map.projection(data_point[id2].loc),
            nextPo = function(tt) {
                var x = po1[0]>po2[0] ? po1[0]-(po1[0]-po2[0])*tt : po1[0]+(po2[0]-po1[0])*tt;
                var y = po1[1]>po2[1] ? po1[1]-(po1[1]-po2[1])*tt : po1[1]+(po2[1]-po1[1])*tt;
                return [x, y];
            },
            path = function(po1, po2) {
                return "M "+po1[0]+" "+po1[1]+" "+po2[0]+" "+po2[1];
            },
            line = map.paper.path(path(po1, nextPo(t))).attr({"stroke":map.options.line.color, 'stroke-width':map.options.line.width});
        d3.timer(function(elapsed) {
            t += 0.02;
            if (t>=1.01) {
                line.attr({"stroke":map.options.line.color, "stroke-width":map.options.line.width});
                line.remove();
                return true;
            } else {
                line.attr({path: path(po1, nextPo(t))});
            }
        });
    },
    flash : function(id, loop) {
        var map = this,
            r = map.el.point[id].data("or");
        map.el.point[id].animate({r: r * map.options.point["flash-scale"], opacity:0}, 2000, '', function() {
            map.el.point[id].attr({opacity:map.options.point.opacity, r: r});
            if (loop===true) {
                map.flash(id, loop);
            }
        });
    },
    stopFlash : function(id) {
        var map = this;
        map.el.point[id].stop();
        map.el.point[id].attr({"r": map.el.point[id].data("or"), opacity:map.options.point.opacity});
    },
    setSize : function(width, height) {
        map.paper.setSize(width, height);
    },
    showTip : function(html) {
        this.tooltip.html(html).css("visibility", "visible");
    },
    hideTip : function() {
        this.tooltip.css("visibility", 'hidden');
    },
    moveTip : function(e) {
        var map = this,
            offset = map.tooltip.offset();
        if (!(e.pageX && e.pageY)) {
            return false;
        }
        var x = e.pageX,
            y = e.pageY,
            width =  map.tooltip.outerWidth ? map.tooltip.outerWidth() : map.tooltip.width(),
            height =  map.tooltip.outerHeight ? map.tooltip.outerHeight() : map.tooltip.height(),
            mouseToNode = 20;
        if (width + x + 2 * mouseToNode <=  map.width) {
            x += mouseToNode;
        } else {
            x = x - width - mouseToNode;
        }   
        if (y >= height + mouseToNode) {
            y = y - mouseToNode - height;
        } else {
            y += mouseToNode;
        }
        map.tooltip.css("left",  x); 
        map.tooltip.css("top",  y);
    },
};
function merge() {
    var i,
    len = arguments.length,
    ret = {},
    doCopy = function (copy, original) {
        var value, key;
        if (typeof copy !== 'object') {
            copy = {};
        }
        for (key in original) {
            if (original.hasOwnProperty(key)) {
                value = original[key];
                if (value && typeof value === 'object' && Object.prototype.toString.call(value) !== '[object Array]' && typeof value.nodeType !== 'number') {
                    copy[key] = doCopy(copy[key] || {}, value);
                } else {
                    copy[key] = original[key];
                }
            }
        }
        return copy;
    };
    for (i = 0; i < len; i++) {
        ret = doCopy(ret, arguments[i]);
    }
    return ret;
}
})(jQuery);
