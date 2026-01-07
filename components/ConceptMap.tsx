
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ConceptNode, ConceptLink } from '../types';

interface ConceptMapProps {
  nodes: ConceptNode[];
  links: ConceptLink[];
  onNodeClick: (node: ConceptNode) => void;
  isUniverseTab?: boolean;
}

const ConceptMap: React.FC<ConceptMapProps> = ({ nodes, links, onNodeClick, isUniverseTab = false }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const container = svgRef.current.parentElement;
    const width = container?.clientWidth || 800;
    const height = isUniverseTab ? (window.innerWidth < 768 ? 500 : 600) : 400;

    const svg = d3.select(svgRef.current)
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);
    
    svg.selectAll("*").remove();

    // Cosmic background stars
    if (isUniverseTab) {
      const starDensity = window.innerWidth < 768 ? 50 : 100;
      const starData = Array.from({ length: starDensity }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.5,
        opacity: Math.random()
      }));
      
      svg.append("g")
        .selectAll("circle")
        .data(starData)
        .join("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", d => d.r)
        .attr("fill", "#fff")
        .attr("opacity", d => d.opacity)
        .style("filter", "blur(0.5px)");
    }

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(width < 768 ? 80 : 120))
      .force("charge", d3.forceManyBody().strength(isUniverseTab ? (width < 768 ? -400 : -600) : -300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(width < 768 ? 35 : 50));

    const link = svg.append("g")
      .attr("stroke", isUniverseTab ? "#475569" : "#cbd5e1")
      .attr("stroke-opacity", 0.4)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1.5)
      .style("stroke-dasharray", isUniverseTab ? "3,3" : "0");

    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", "concept-node")
      .style("cursor", "pointer")
      .on("click", (event, d: any) => onNodeClick(d))
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    // Glow effects
    const defs = svg.append("defs");
    nodes.forEach(n => {
      const filter = defs.append("filter").attr("id", `glow-${n.id}`);
      filter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur");
      const feMerge = filter.append("feMerge");
      feMerge.append("feMergeNode").attr("in", "coloredBlur");
      feMerge.append("feMergeNode").attr("in", "SourceGraphic");
    });

    node.append("circle")
      .attr("r", (d: any) => d.category === 'core' ? (width < 768 ? 25 : 35) : (width < 768 ? 16 : 22))
      .attr("fill", (d: any) => {
        if (d.category === 'core') return isUniverseTab ? "#818cf8" : "#6366f1";
        if (d.category === 'prerequisite') return "#ec4899";
        return "#10b981";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("filter", isUniverseTab ? (d: any) => `url(#glow-${d.id})` : "none");

    node.append("text")
      .attr("dy", ".35em")
      .attr("text-anchor", "middle")
      .attr("fill", isUniverseTab ? "#fff" : "#1e293b")
      .attr("font-size", isUniverseTab ? (width < 768 ? "10px" : "12px") : (width < 768 ? "8px" : "10px"))
      .attr("font-weight", "700")
      .attr("y", (d: any) => d.category === 'core' ? (width < 768 ? 35 : 50) : (width < 768 ? 25 : 35))
      .text((d: any) => d.name)
      .style("text-shadow", isUniverseTab ? "0 0 10px rgba(0,0,0,0.8)" : "none")
      .each(function(d) {
         // Simple text wrapping or truncation for small screens
         const text = d3.select(this);
         const content = text.text();
         if (width < 768 && content.length > 10) {
           text.text(content.substring(0, 8) + '...');
         }
      });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => simulation.stop();
  }, [nodes, links, onNodeClick, isUniverseTab]);

  return (
    <div className={`w-full h-full ${isUniverseTab ? 'bg-slate-900 border-indigo-900' : 'bg-white border-slate-200'} rounded-2xl lg:rounded-3xl shadow-2xl overflow-hidden border transition-colors duration-500`}>
      <div className={`p-4 lg:p-5 border-b ${isUniverseTab ? 'border-indigo-800/50 bg-indigo-950/30' : 'border-slate-100 bg-slate-50/50'} flex justify-between items-center`}>
        <div>
          <h3 className={`font-black tracking-tight text-xs lg:text-sm ${isUniverseTab ? 'text-indigo-300' : 'text-slate-700 uppercase'}`}>
            {isUniverseTab ? 'EXPLORABLE UNIVERSE' : 'Knowledge Navigator'}
          </h3>
          {isUniverseTab && <p className="text-[8px] lg:text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Interactive Galaxy View</p>}
        </div>
        <div className="flex gap-2 lg:gap-4 text-[8px] lg:text-[10px] font-black uppercase tracking-widest shrink-0">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Core</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Related</span>
        </div>
      </div>
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};

export default ConceptMap;
