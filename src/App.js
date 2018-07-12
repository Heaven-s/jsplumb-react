import React, { Component } from 'react';
import { jsPlumb } from "jsplumb";
import dagre from "dagre";

const JSPLUMB_ID = 'jsplumb_box';
const color = "gray";
const arrowCommon = {
  foldback: 0.5,
  fill: color,
  fillStyle: color,
  width: 14
};
const overlays = [
  ["Arrow", {
    location: 1
  }, arrowCommon]
];

let edges = [
  {
    sourceId: "1",
    targetId: "2",
  },
  {
    sourceId: "2",
    targetId: "3",
  },
  {
    sourceId: "3",
    targetId: "4",
  },
]

let nodes = [
  {
    id: "1",
    name: 'Node 1',
    style: {
    },
  },
  {
    id: "2",
    name: 'Node 2',
    style: {
    },
  },
  {
    id: "3",
    name: 'Node 3',
    style: {
    },
  },
  {
    id: "4",
    name: 'Node 4',
    style: {
    },
  },
]


const getLayout = (nodes, edges, separation = 30) => {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({
    marginx: ((document.documentElement.clientWidth || document.body.clientWidth) - 224 - 50 - 240) / 2,
    marginy: 0,
    nodesep: 30,
    rankdir: "TB",
    ranker: "longest-path",
    ranksep: separation,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  nodes.forEach(node => {
    const id = node.id;
    graph.setNode(id, { width: 240, height: 80 });
  });

  edges.forEach(connection => {
    graph.setEdge(connection.sourceId, connection.targetId);
  });

  dagre.layout(graph);
  return graph;
};
const graphNodes = getLayout(nodes, edges);
nodes = nodes.map(node => {
  const location = graphNodes._nodes[node.id];
  let top = node.style ? node.style.top : ''
  let left = node.style ? node.style.left : ''
  return {
    ...node,
    style: {
      left: left ? left : `${location.x}px`,
      top: top ? top : `${location.y}px`,
    },
  };
});

const jsPlumbSettings = {
  Connector: [
    "Flowchart",
    {
      alwaysRespectStubs: true,
      cornerRadius: 20,
      midpoint: 0.5,
      stub: [30, 30],
    },
  ],
  DragOptions: {
    cursor: "pointer",
    zIndex: 2000
  },
  PaintStyle: {
    stroke: color,
    strokeStyle: color,
    lineWidth: 2
  },
  EndpointStyle: {
    radius: 9,
    fill: color,
    fillStyle: color
  },
  HoverPaintStyle: {
    stroke: "#ec9f2e",
    strokeStyle: "#ec9f2e"
  },
  EndpointHoverStyle: {
    fill: "#ec9f2e",
    fillStyle: "#ec9f2e"
  },
  ConnectionOverlays: overlays,
  Container: "canvas"
}


class App extends Component {

  state = {
    edges,
    nodes,
    jsPlumbInstance: null,
    isJsPlumbInstanceCreated: false,
    dragging: false, // 是否触发画布拖动
    nodeDragging: false, // 是否触发node拖动
    _ratio: 0.25, // 滚轮的比率
    _scale: 1, // 画布缩放比例
    _left: 0, // 画布Left位置
    _top: 0, // 画布Top位置
    _initX: 0, // 拖动按下鼠标时的X位置
    _initY: 0 // 拖动按下鼠标时的Y位置
  }

  // 连线事件
  onConnection = (connObj, originalEvent) => {
    if (!originalEvent) {
      return;
    }
    connObj.connection.setPaintStyle({
      stroke: "#8b91a0",
      strokeStyle: "#8b91a0"
    });
    let sourceId = connObj.sourceId;
    let targetId = connObj.targetId;
    this.setState({
      edges: [...this.state.edges, {
        sourceId: sourceId,
        targetId: targetId
      }],
    });
    return false;
  }

  // 删线事件
  onDelConnection = (connObj, originalEvent) => {
    if (!originalEvent) {
      return;
    }
    this.removeConnection(connObj)
    return false;
  }

  // 删除连接线
  removeConnection = (connection) => {
    this.setState({
      edges: this.state.edges.filter(
        (conn) =>
          !(
            conn.sourceId === connection.sourceId &&
            conn.targetId === connection.targetId
          )
      ),
    });
    this.updateParent();
  };

  // 更新父组件状态
  updateParent = () => {
    if (this.props.onChange) {
      this.props.onChange({
        edges: this.state.edges,
        nodes: this.state.nodes,
      });
    }
  };

  // 绑定父组件传入的事件
  setEventListeners = (jsPlumbInstance) => {
    const eventListeners = this.props.eventListeners
    if (eventListeners && typeof eventListeners === "object" && typeof eventListeners.length === "number") {
      Object.keys(eventListeners).forEach(event => {
        if (typeof eventListeners[event] !== "undefined") {
          jsPlumbInstance.bind(event, eventListeners[event]);
        }
      });
    }
  }

  // 缩放画布
  onCanvasMousewheel = (e) => {
    let self = this.state
    //放大
    if (e.deltaY < 0) {
      this.setState({
        _scale: self._scale + self._scale * self._ratio
      })
    }
    //缩小
    if (e.deltaY > 0) {
      this.setState({
        _scale: self._scale - self._scale * self._ratio
      })
    }
  }

  // node move
  onMouseMove = (e) => {
    if (!this.state.nodeDragging) {
      this.setState({
        nodeDragging: true
      })
    }
  }

  // 拖动画布
  onCanvasMousedown = (e) => {
    this.setState({
      _initX: e.pageX,
      _initY: e.pageY,
      dragging: true
    })
  }

  upDateNode = (options) => {
    let nodesDom = this.refs[JSPLUMB_ID].querySelectorAll('.gui-canvas-node')
    if (options) {
      this.refs[JSPLUMB_ID].style.left = '0px'
      this.refs[JSPLUMB_ID].style.top = '0px'
    }
    options = options || {}
    this.setState({
      ...options,
      nodeDragging: false,
      nodes: this.state.nodes.map((el) => {
        for(let i = 0, l = nodesDom.length; i < l; i++){
          let nodeDom = nodesDom[i]
          if (nodeDom.id == el.id) {
            el.style = {
              top: nodeDom.style.top,
              left: nodeDom.style.left
            }
            break;
          }
        }
        return el
      })
    })
  }

  // 释放画布
  onCanvasMouseUpLeave = (e) => {
    let self = this.state
    
    if (self.dragging) {
      let _left = self._left + e.pageX - self._initX
      let _top = self._top + e.pageY - self._initY

      this.refs[JSPLUMB_ID].style.left = _left + 'px'
      this.refs[JSPLUMB_ID].style.top = _top + 'px'
      this.setState({
        _left,
        _top,
        nodeDragging: false,
        dragging: false
      })
    } else if (self.nodeDragging) {
      // node 的onMouseDown事件被阻止
      this.upDateNode()
    }
  }

  // 移动画布
  onCanvasMousemove = (e) => {
    let self = this.state
    if (!self.dragging) {
      return;
    }
    this.refs[JSPLUMB_ID].style.left = self._left + e.pageX - self._initX + 'px'
    this.refs[JSPLUMB_ID].style.top = self._top + e.pageY - self._initY + 'px'
  }

  componentDidMount() {

    jsPlumb.ready(() => {
      const jsPlumbInstance = jsPlumb.getInstance(jsPlumbSettings || {})
      jsPlumbInstance.setContainer(document.getElementById(JSPLUMB_ID));
      jsPlumbInstance.bind("connection", this.onConnection);
      jsPlumbInstance.bind("contextmenu", this.onDelConnection);
      jsPlumbInstance.bind("connectionDetached", this.onDelConnection);
      this.setEventListeners(jsPlumbInstance);

      let sourceEndpointStyle = {
        fill: "#1fb139",
        fillStyle: "#1fb139"
      };
      let targetEndpointStyle = {
        fill: "#f65d3b",
        fillStyle: "#f65d3b"
      };
      let endpoint = ["Dot", {
        cssClass: "endpointClass",
        radius: 5,
        hoverClass: "endpointHoverClass"
      }];
      let connector = ["Flowchart", {
        cssClass: "connectorClass",
        hoverClass: "connectorHoverClass"
      }];
      let connectorStyle = {
        lineWidth: 2,
        stroke: "#15a4fa",
        strokeStyle: "#15a4fa"
      };
      let hoverStyle = {
        stroke: "#1e8151",
        strokeStyle: "#1e8151",
        lineWidth: 2
      };
      let anSourceEndpoint = {
        endpoint: endpoint,
        paintStyle: sourceEndpointStyle,
        hoverPaintStyle: {
          fill: "#449999",
          fillStyle: "#449999"
        },
        isSource: true,
        maxConnections: -1,
        Anchor: ["TopCenter"],
        connector: connector,
        connectorStyle: connectorStyle,
        connectorHoverStyle: hoverStyle
      };
      let anTargetEndpoint = {
        endpoint: endpoint,
        paintStyle: targetEndpointStyle,
        hoverPaintStyle: {
          fill: "#449999",
          fillStyle: "#449999"
        },
        isTarget: true,
        maxConnections: -1,
        Anchor: ["BottomCenter"],
        connector: connector,
        connectorStyle: connectorStyle,
        connectorHoverStyle: hoverStyle
      };

      //画点
      let nodes = this.state.nodes
      for (let i = 0; i < nodes.length; i++) {
        let nUUID = nodes[i].id;
        jsPlumbInstance.addEndpoint(nUUID, anSourceEndpoint, {
          uuid: nUUID + "-bottom",
          anchor: "Bottom",
          maxConnections: -1
        });
        jsPlumbInstance.addEndpoint(nUUID, anTargetEndpoint, {
          uuid: nUUID + "-top",
          anchor: "Top",
          maxConnections: -1
        });
        jsPlumbInstance.draggable(nUUID);
      }


      //画线
      let edges = this.state.edges
      for (let j = 0; j < edges.length; j++) {
        let connection = jsPlumbInstance.connect({
          uuids: [edges[j].sourceId + "-bottom", edges[j].targetId + "-top"],
        });
        connection.setPaintStyle({
          stroke: "#8b91a0",
          strokeStyle: "#8b91a0"
        });
      }

      this.setState({
        isJsPlumbInstanceCreated: true,
        jsPlumbInstance,
      });
    });

  }

  render() {

    let leftArray = [];
    let topArray = [];

    const nodesDom = this.state.nodes.map((node) => {
      const style = node.style || {};

      leftArray.push(parseFloat(style.left || 0));
      topArray.push(parseFloat(style.top || 0));

      return <div className="gui-canvas-node"
        onMouseMove={this.onMouseMove}
        key={node.id} style={style} id={node.id}>
        <div className="node-cnt">
          <h3 className="node-title">{node.name}</h3>
        </div>
      </div>
    })

    const nodesMap = this.state.nodes.map((node) => {
      return <div className="gui-canvas-node" key={node.id + '_map'} style={node.style}>
        <div className="node-cnt">
          <h3 className="node-title">{node.name}</h3>
        </div>
      </div>
    })


    leftArray.sort((a, b) => { return a > b })
    topArray.sort((a, b) => { return a > b })

    let difLeft = leftArray[leftArray.length - 1] - leftArray[0] + 240
    let difTop = topArray[topArray.length - 1] - topArray[0] + 80

    let scale = Math.min(144 / (difLeft), 144 / (difTop))
    let left = 0
    let top = 0

    if (difLeft > difTop) {
      left = -leftArray[0] * scale
      top = -topArray[0] * scale + (144 - difTop * scale) / 2
    } else {
      left = -leftArray[0] * scale + (144 - difLeft * scale) / 2
      top = -topArray[0] * scale
    }

    let translateWidth = (document.documentElement.clientWidth * (1 - this.state._scale)) / 2;
    let translateHeight = ((document.documentElement.clientHeight - 60) * (1 - this.state._scale)) / 2;

    return (
      <div className="App">
        <header className="App-header">主页
          <a style={{ marginLeft: '30px' }} href="javascript:;" onClick={(e)=> { this.upDateNode({ _scale: 1, _left: 0, _top: 0 }) }}>还原</a>
          <a style={{ marginLeft: '30px' }} href="javascript:;" onClick={(e)=> { console.log({ nodes: this.state.nodes, edges: this.state.edges }) }}>提交参数</a>
        </header>
        <div key={JSPLUMB_ID} className="jsplumb-box"
          onWheel={this.onCanvasMousewheel}
          onMouseMove={this.onCanvasMousemove}
          onMouseDown={this.onCanvasMousedown}
          onMouseUp={this.onCanvasMouseUpLeave}
          onMouseLeave={this.onCanvasMouseUpLeave}
          onContextMenu={(event) => { event.stopPropagation(); event.preventDefault(); }}
        >
          <div style={{
            width: '150px',
            height: '150px',
            padding: '2px',
            position: 'absolute',
            right: '30px',
            top: '30px',
            border: '1px solid #c1c1c1',
            background: '#F6F6F6',
            zIndex: 2,
            cursor: 'move',
          }}>
            <div style={{
              position: 'relative',
              width: '50px',
              height: '50px',
              left: `${left}px`,
              top: `${top}px`,
              transformOrigin: '0px 0px 0px',
              transform: `scale(${scale})`
            }}>
              {
                nodesMap
              }
            </div>
          </div>
          <div className="jsplumb-canvas"
            ref={JSPLUMB_ID}
            id={JSPLUMB_ID}
            style={{
              transformOrigin: '0px 0px 0px',
              transform: `translate(${translateWidth}px, ${translateHeight}px) scale(${this.state._scale})`
            }}
          >
            {
              nodesDom
            }
          </div>
        </div>
      </div>
    )
  }
}

export default App;