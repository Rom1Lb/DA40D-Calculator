import { SelectField } from './InputField.jsx'
import { AIRCRAFT_LIST } from '../data/aircraft.js'

export function AircraftPanel({ state, setField, mb }) {
  const ac = AIRCRAFT_LIST.find(a => a.registration === state.acReg)

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Aircraft</span>
        {ac && <span className="badge badge-ok">{ac.registration}</span>}
      </div>
      <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <SelectField
          label="Registration"
          value={state.acReg}
          onChange={v => setField('acReg', v)}
          options={AIRCRAFT_LIST.map(a => ({
            value: a.registration,
            label: `${a.registration}  —  BEW ${a.bew} kg`,
          }))}
        />
        {ac && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            {[
              { label:'BEW',      val:`${ac.bew} kg`      },
              { label:'CG arm',   val:`${ac.arm} m`       },
              { label:'Fuel max', val:`${ac.fuelUSG} USG` },
            ].map(({ label, val }) => (
              <div key={label} className="computed-field">
                <div className="computed-label">{label}</div>
                <div className="computed-value">{val}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
