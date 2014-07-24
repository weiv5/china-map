(function($){
var defaultOptions = {
    point : {
        r : {
            normal : 20,
            focus : 30,
            flash : 60
        },
        color : "orange",
        tooltip : function(id, city) {
            return city.name;
        }
    },
    line : {
        color : "steelblue",
        width : 1.2,
        "move-color" : "green"
    },
    map : {},
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
        map.colors = d3.scale.linear().domain([0, 100]).range(["#ffffff", "orange"]),

        map.maps = {},
        map.points = {},
        map.lines = {};

        map.tooltip = $("<div/>").css({
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
        });
        $(container).append(map.tooltip);
        map.draw();
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
            mouseToNode = 5;
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
    draw : function() {
        var map = this;
        data_map.features.forEach(function(d) {
            var state = map.paper.path(map.getAreaPath(d));
            state.attr({
                "stroke": "#fff",
                "fill-opacity" : 0.7,
                "fill" : "#000"
            }).toBack();
            map.maps[d.id] = state;
        });
    },
    point : function(id) {
        var map = this;
        var city = data_point[id];
        var loc = map.projection(city.loc);
        var point = map.paper.circle(loc[0], loc[1], map.options.point.r.normal).attr({
            "fill": "orange",
            "fill-opacity": 1,
            "stroke": 0
        });
        point.mouseover(function(){
            this.attr({"r": map.options.point.r.focus});
            map.showTip(map.options.point.tooltip(id, city));
        }).mouseout(function(){
            this.attr({"r": map.options.point.r.normal});
            map.hideTip();
        }).mousemove(function (e) {
            map.moveTip(e);
        });
        map.points[id] = point;
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
            line = map.paper.path(path(po1, nextPo(t))).attr({"stroke":map.options.line["move-color"], 'stroke-width':map.options.line.width});
        map.lines[id1+"_"+id2] = line;
        d3.timer(function(elapsed) {
            t += 0.02;
            if (t>=1.01) {
                map.flash(id2);
                line.attr({"stroke":map.options.line.color, "stroke-width":map.options.line.width});
                return true;
            } else {
                line.attr({path: path(po1, nextPo(t))});
            }
        });
    },
    flash : function(id, loop) {
        var map = this;
        map.points[id].animate({r:map.options.point.r.flash, opacity:0}, 2000, '', function() {
            map.points[id].attr({opacity:1, r:map.options.point.r.normal});
            if (loop===true) {
                map.flash(id, loop);
            }
        });
    },
    stopFlash : function(id) {
        var map = this;
        map.points[id].stop();
    },
    setSize : function(width, height) {
        map.paper.setSize(width, height);
    }
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
