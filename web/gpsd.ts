import type { Fix, Satellite, SkyFrame } from './index.js';
const constellations:Record<number,string> = {0:'GPS',1:'SBAS',2:'Galileo',3:'BeiDou',4:'Unknown',5:'QZSS',6:'GLONASS',7:'NavIC'};
const number = (v:unknown):v is number => typeof v==='number' && Number.isFinite(v);
/** Stateful adapter for one device. Feed TPV + SKY objects from a gpsd bridge. */
export class GpsdAdapter {
  private fix:Fix = 'unknown';
  private satellites:Satellite[] = [];
  constructor(private device?:string) {}
  reset():void { this.fix='unknown'; this.satellites=[]; }
  ingest(value:unknown):SkyFrame | null {
    if (!value || typeof value!=='object') throw new TypeError('Expected gpsd object');
    const msg=value as Record<string,unknown>;
    if (this.device && msg.device!==this.device) return null;
    if (!this.device && typeof msg.device==='string') this.device=msg.device;
    if(msg.class==='TPV') {
      this.fix = msg.mode===3 ? '3d' : msg.mode===2 ? '2d' : msg.mode===1 ? 'none' : 'unknown';
    } else if (msg.class==='SKY') {
      if (!Array.isArray(msg.satellites)) throw new TypeError('SKY.satellites must be an array');
      if(msg.satellites.length>512) throw new TypeError('Too many satellite signals');
      this.satellites = msg.satellites.flatMap((raw):Satellite[] => {
        if(!raw || typeof raw!=='object') return [];
        const s=raw as Record<string,unknown>;
        // gpsd may omit angles for tracked signals; do not invent a sky position.
        if(!number(s.az) || !number(s.el) || s.az<0 || s.az>=360 || s.el< -90 || s.el>90) return [];
        const id=s.svid ?? s.PRN;
        if(typeof id!=='string' && !number(id)) return [];
        return [{id:String(id), constellation:number(s.gnssid) ? (constellations[s.gnssid] ?? 'Unknown') : 'Unknown',
          azimuth:s.az, elevation:s.el, cn0:number(s.ss) && s.ss>=0 && s.ss<=100 ? s.ss : null,
          used:s.used===true, ...(number(s.sigid) ? {signal:`signal ${s.sigid}`} : {})}];
      });
    } else return null;
    return structuredClone({satellites:this.satellites,fix:this.fix});
  }
}
