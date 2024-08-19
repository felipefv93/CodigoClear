import * as React from 'react';
import MonitoringPageLogic from "./bda-monitoring-page-logic";
import * as styles from './bda-monitoring-page.scss';
import { observer } from 'mobx-react';
import { RcfaBdaClientForm, RecurrenceUserData } from '../../../../models/rcfa-bda-form';
import * as moment from 'moment';
import Xelect from '../../../../lib/components/xelect/xelect';


interface MonitoringPageProps {
    rcfaBdaClientForm:RcfaBdaClientForm;
    rcfaBdaId?:number;
}

@observer
export default class BdaMonitoringPage extends React.Component<MonitoringPageProps> {

    public logic: MonitoringPageLogic;
    private rcfaBdaId?:number;

    constructor(props: any) {
        super(props);
        this.rcfaBdaId = this.props.rcfaBdaId;
        this.logic = new MonitoringPageLogic(this.props.rcfaBdaClientForm, this.rcfaBdaId, this);
    }

    componentDidMount() {
        this.logic.onComponentDidMount();
        
    }
    
    private inserColumnsWeek = (type:number) =>{
        let column:any = [];
        let maxColumn = this.logic.rcfaBdaClientForm.ExpectedFollowUpWeekCount;
        if(type==1){
            // TODO:
            // CAMBIAR CICLOS DEL LOOP AL NUMERO DE SEMANAS CONFIGURADAS
            for (let i = 0; i < maxColumn; i++) {
                if(i < this.logic.monitoringList.length){
                    column.push(<td key={"monitoring-"+i} className={this.logic.monitoringList[i].HadRecurrence?"":styles.greenTd}>{i+1}</td>)
                }else
                    column.push(<td key={"monitoring-"+i}>{i + 1}</td>)
            }
        }else{
            // TODO:
            // CAMBIAR CICLOS DEL LOOP AL NUMERO DE SEMANAS CONFIGURADAS
            for (let i = 0; i < maxColumn; i++) {
                if(i < this.logic.monitoringList.length){
                    column.push(<td key={"monitoring-"+i} title={`Semana: Inicio ${moment(this.logic.monitoringList[i].StartWeek).format('MMM DD, YYYY')} - Fin ${moment(this.logic.monitoringList[i].EndWeek).format('MMM DD, YYYY')}`} className={this.logic.monitoringList[i].HadRecurrence?styles.redTd:""}>{this.logic.monitoringList[i].RecurrencesNumber}</td>)
                }else
                    column.push(<td key={"monitoring-"+i}>{"-"}</td>)
            }
        }
        return column;
    }
    
    
    private weekTable = () =>{
        return(
            <table>
                <tbody style={{backgroundColor: "#dddddd6e"}}>
                    <tr className={`${styles.trCustom}`}>
                        <td style={{width: "12%"}}>Semana</td>
                        {
                            this.inserColumnsWeek(1)
                        }
                    </tr>
                    <tr className={`${styles.trCustom}`}>
                        <td style={{width: "12%"}}>No. Reaparición</td>
                        {
                            this.inserColumnsWeek(2)
                        }
                    </tr>
                </tbody>
            </table>
        );
    }
    
    private setFormat = (date:any) => {
        return moment(date,"YYYY-MM-DDTHH:mm:ss").format("MMM DD, YYYY");
    }

    private isRecurrence = (e:any) =>{
        e.preventDefault();
        ($('#modal-recurrence')as any).modal('open');
    }
    
    private createRecurrence = async(e:any) =>{
        e.preventDefault();
        try{
            let response;
            response = await this.logic.setRecurrence();
            console.log(response)
            if(response){
                this.closeRecurrence(e);
            }
        }catch(err){
            console.log(err);
        }
    }

    private closeRecurrence =(e:any)=>{
        e.preventDefault();
        this.logic.UserRecurrence = {... new RecurrenceUserData()};
        this.logic.hasDateError = false;
        this.logic.hasEmployeeError = false;
        this.logic.DetectedByEmployeeId = -1;
        this.logic.DetectedByEmployee = [];
        ($('#modal-recurrence')as any).modal('close');
    }

    private usersRecurrences = () =>{
        return (
            <div className="col s12 m6 l6 offset-m3 offset-l3">

                <h6 style={{textAlign:"center"}}>Recurrencias</h6>
                
                <table className="striped" style={{marginBottom:25}}>
                    <thead style={{backgroundColor: "#ddd"}}>
                        <tr>
                            <th>No.</th>
                            <th>Socio</th>
                            <th>Fecha</th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            this.logic.monitoringEmployeeList.map((employee,i)=>
                            <tr key={"employee-monitoring-"+i}>
                                <td>{(i+1)}</td>
                                <td>{employee.MarkedByEmployeeName}</td>
                                <td>{this.setFormat(employee.MarkedAtDate)}</td>
                            </tr>
                            )
                        }
                    </tbody>
                </table>
                <div className="row" style={{textAlign:"center",marginBottom:0}}>
                    <a href="" className={`wave wave-effect wave-light btn ${styles.btnRecurrence}`} onClick={(e)=>this.isRecurrence(e)}>
                        <i className={`fas fa-exclamation`} style={{color:"#c10303",marginRight:15}}></i>
                        Recurrencia
                    </a>
                </div>
            </div>
        );
    }

    render() {
        var self = this;
        return (
            <div id="bdamonitoring" className={"col s12 tabAnyBda"} style={{display: "none"}}>
                <div className="row" style={{margin:0}}>
                    <h5 style={{color:"green"}}>Recurrencias</h5>
                </div>
                <div className="row">
                    {
                        this.logic.isLoanding ?
                            <div className="col s12 m12 l12">
                                <div className="progress">
                                    <div className="indeterminate"></div>
                                </div>
                            </div>
                        :
                            this.weekTable()
                    }
                </div>
                <div className="row">
                    <div className="col s12 m3 l3 date_picker">
                        <img src="./images/icon_calendar_green.svg" alt="Calendario" style={{ cursor: 'pointer' }}/>
                        <div className="icon_field">
                            <label htmlFor="bdaConcludedDate">Fecha BDA concluido</label>
                            <input id="bdaConcludedDate" name="date" type="text"
                                className={`datepicker`}
                                readOnly={true} disabled/>
                        </div>
                    </div>
                </div>
                <div className="row">
                    {self.usersRecurrences()}
                </div>
                <div id="modal-recurrence" className="modal">
                    <div className="modal-content" style={{paddingBottom:0}}>
                        <div className={`${styles.modalHead}`}>
                            <h5>Registro de recurrencia</h5>
                            <a href="#!" className="modal-close waves-effect waves-green btn-flat" onClick={(e)=>this.closeRecurrence(e)}><i className="fas fa-times"></i></a>
                        </div>
                        <div className="row" style={{marginTop:25}}>
                            <div className="input-field col s12 m6 l6">
                                <i className="material-icons prefix">date_range</i>
                                <input 
                                    id="BdaRecurrenceMarkedAtDate" 
                                    type="text" 
                                    className="datepicker"
                                    disabled={true}
                                    value={moment(new Date()).format('MMM DD, YYYY')}
                                />
                                <label className="active" htmlFor="BdaRecurrenceMarkedAtDate">Fecha de recurrencia</label>
                                {
                                    this.logic.hasDateError?
                                        <p style={{margin:0,color:"red"}}>Ingrese la fecha de la recurrencia</p>
                                        :null
                                }
                            </div>
                            <div className="input-field col s12 m12 l12">
                                <div className={styles.customXelect}>
                                    <Xelect id="DetectedByEmployeeId"
                                            name="DetectedByEmployeeId"
                                            multiple={false}
                                            getLabel={this.logic.getEmployeeLabel}
                                            getValue={this.logic.getEmployeeValue}
                                            getOptions={this.logic.filterEmployee}
                                            delay={500}
                                            values={this.logic.DetectedByEmployee}
                                            onSelectionChange={this.logic.handleDetectedByEmployeeIdChange}
                                    />
                                    <label>Persona que registra recurrencia</label>
                                    {
                                        this.logic.hasEmployeeError?
                                            <p style={{margin:0,color:"red"}}>Ingrese la persona que registra recurrencia</p>
                                            :null
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer" style={{textAlign:"center"}}>
                        {
                            this.logic.isSaveCurrence ?
                                <i className={"fas fa-spinner fa-spin"}></i>
                            :
                            <a href="#!" className={`wave wave-effect wave-light btn ${styles.btnRecurrence}`} onClick={(e)=>this.createRecurrence(e)}>Registrar recurrencia</a>
                        }
                    </div>
                </div>
            </div>
        );
    }
}