(function($){
var defaultOptions = {
    point : {
        "radius" : 20,
        "flash-scale" : 2,
        "flash-speed" : 1000,
        "color" : "orange",
        "border-color": "orange",
        "border-width": 1,
        "opacity" : 1
    },
    line : {
        "color" : "yellow",
        "width" : 1.5
    },
    area : {
        "color" : "#1b1b1b",//["#ffffff", "orange"],
        "opacity" : 1,
        "border-color": "rgba(30,144,255,1)",
        "border-focus" : "blue",
        "word-color" : "#fff",
        "word-size" : "30px"
    },
    tooltip : {
        style : {
            "border": "1px solid",
            "border-color": "rgba(0, 0, 0, 0.8)",
            "background-color": "rgba(0, 0, 0, 0.75)",
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
        format : function() {
            return this.data("name")+":"+this.data("data")+",type:"+this.data("type");
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
            point: {},
            flash: {}
        };
        map.attr = {
            area : {
                "stroke": map.options.area["border-color"],
                "fill-opacity" : map.options.area.opacity,
                "stroke-width" : 1,
            },
            word : {
                "fill": map.options.area["word-color"],
                'font-size': map.options.area["word-size"]
            },
            point : {
                "fill" : map.options.point.color,
                "fill-opacity" : map.options.point.opacity,
                "stroke" : map.options.point["border-color"],
                "stroke-width" : map.options.point["border-width"]
            },
            line : {
                "stroke" : map.options.line.color,
                'stroke-width' : map.options.line.width
            },
            linePoint : {
                "fill" : map.options.line.color,
                "opacity": 1,
                "stroke" : map.options.line.color,
                "stroke-width" : map.options.point["border-width"]
            }
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
                var state = map.paper.path(map.getAreaPath(d)).attr(map.attr.area).attr({
                    "fill": colors(tmp[d.id])
                }).data({
                    "id" : d.id,
                    "data" : tmp[d.id],
                    "name" : d.properties.name,
                    "type" : "area"
                }).mouseover(function() {
                    map.showTip(map.options.tooltip.format.apply(this));
                }).mouseout(function(){
                    map.hideTip();
                }).mousemove(function(e){
                    map.moveTip(e);
                });
                map.el.area[d.id] = state;
                
                var loc = map.projection(d.properties.cp);
                map.el.word[d.id] = map.paper.text(loc[0], loc[1], d.properties.name).attr(map.attr.word);
            });
        } else {
            data_map.features.forEach(function(d) {
                map.el.area[d.id].attr({
                    "fill" : colors(tmp[d.id])
                }).data({
                    "data" : tmp[d.id]
                }).toBack();
            });
        }
        return this;
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
            radius = function(num) {return r_plus(num) + 10;}
        for (var i in tmp) {
            (function(id, num){
                var r = radius(num);
                if (map.el.point[id]) {
                    map.el.point[id].attr({
                        "r" : r
                    }).data({
                        "or": r,
                        "data" : num
                    });
                } else {
                    var city = data_point[id];
                    var loc = map.projection(city.loc);
                    var flash_r = r * map.options.point["flash-scale"];
                    var point = map.paper.circle(loc[0], loc[1], r).attr(map.attr.point).data({
                        "id" : id,
                        "name" : city.name,
                        "data" : num,
                        "type" : "point",
                        "or" : r
                    }).mouseover(function() {
                        this.attr({"r": flash_r});
                        map.showTip(map.options.tooltip.format.apply(this));
                    }).mouseout(function(){
                        this.attr({"r": r});
                        map.hideTip();
                    }).mousemove(function (e) {
                        map.moveTip(e);
                    });
                    map.el.point[i] = point;

                    map.el.flash[i] = {
                        "c1" : map.paper.circle(loc[0], loc[1], 0).attr(map.attr.point),
                        "c2" : map.paper.circle(loc[0], loc[1], 0).attr(map.attr.point),
                        "do" : false,
                    };
                }
            })(i, tmp[i]);
        }
        return this;
    },
    line : function(id1, id2) {
        if (id1 == id2 || !data_point[id1] || !data_point[id2]) {
            return false;
        }
        var map = this;
        var t = 0,
            delta = 0.02,
            p1 = map.projection(data_point[id1].loc),
            p2 = map.projection(data_point[id2].loc),
            nextPo = function(po1, po2, tt) {
                var x = po1[0]>po2[0] ? po1[0]-(po1[0]-po2[0])*tt : po1[0]+(po2[0]-po1[0])*tt;
                var y = po1[1]>po2[1] ? po1[1]-(po1[1]-po2[1])*tt : po1[1]+(po2[1]-po1[1])*tt;
                return [x, y];
            },
            path = function(po1, po2) {
                return "M "+po1[0]+" "+po1[1]+" "+po2[0]+" "+po2[1];
            },
            line = map.paper.path(path(p1, nextPo(p1, p2, t))).attr(map.attr.line),
            dot = map.paper.circle(p2[0], p2[1], 8).attr({fill: map.options.line.color, stroke: map.options.line.color});
        d3.timer(function(elapsed) {
            t += delta;
            if (t>=1.01) {
                line.attr(map.attr.line);
                map.flash(id2, false, "line");
                d3.timer(function(elapsed2) {
                    t -= delta;
                    if (t <= 0) {
                        dot.remove();
                        line.remove();
                        return true;
                    } else {
                        line.attr({path: path(p2, nextPo(p2, p1, t))});
                    }
                });
                return true;
            } else {
                var loc = nextPo(p1, p2, t);
                line.attr({path: path(p1, loc)});
                dot.attr({cx: loc[0], cy: loc[1]});
            }
        });
    },
    flash : function(id, loop, type) {
        var map = this;
        if (typeof map.el.flash[id] === 'undefined') {
            return;
        }
        if (type === "line") {
            map.el.flash[id].c1.attr(map.attr.linePoint);
            map.el.flash[id].c2.attr(map.attr.linePoint);
        }
        if (map.el.flash[id].do) {
            return;
        }
        map.el.flash[id].do = true;
        map.el.point[id].hide();
        map.flashing(id, loop);
    },
    flashing : function(id, loop) {
        var map = this,
            r = map.el.point[id].data("or"),
            speed = map.options.point["flash-speed"];
        map.el.flash[id].c1.animate({r: r * map.options.point["flash-scale"], opacity: map.options.point.opacity}, speed, '', function() {
            map.el.flash[id].c1.animate({opacity: 0}, speed, '', function() {
                map.el.flash[id].c1.attr(map.attr.point).attr({"r": 0});
            });
            map.el.flash[id].c2.attr(map.attr.point).attr({"r": 0});
            if (!loop) {
                map.el.point[id].attr({r: 0}).show().animate({r: r}, speed, '', function(){
                    map.el.flash[id].do = false;
                });
            } else {
                map.el.flash[id].c2.animate({r: r * map.options.point["flash-scale"], opacity: map.options.point.opacity}, speed, '', function() {
                    map.el.flash[id].c2.animate({opacity: 0}, speed, '', function() {
                        map.el.flash[id].c2.attr(map.attr.flashing);
                    });
                    map.flashing(id, loop);
                });
            }
        });
    },
    stopFlashing : function(id) {
        var map = this;
        map.el.flash[id].c1.stop().attr({opacity:map.options.point.opacity, r: 0});
        map.el.flash[id].c2.stop().attr({opacity:map.options.point.opacity, r: 0});
        map.el.flash[id].do = false;
        map.el.point[id].attr({r: 0}).show().animate({"r": map.el.point[id].data("or")}, 1500);
    },
    stopFlash : function(id) {
        var map = this;
        if (typeof id === "undefined") {
            for (var i in map.el.flash) {
                map.stopFlashing(i);
            }
        } else if (typeof map.el.flash[id] !== "undefined") {
            map.stopFlashing(id);
        }
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
