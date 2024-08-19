import * as React from 'react';
import {observer} from "mobx-react";
import DescriptionPageLogic from "./bda-description-page-logic";
import Xelect from "../../../../lib/components/xelect/xelect";
import { observable } from '../../../../../node_modules/mobx';
import { RcfaBdaClientForm } from 'ClientApp/models/rcfa-bda-form';
import BoomAutocomplete from "../../../common/boom-autocomplete/boom-autocomplete";
import BoomFiltersState from "../../../../models/boom-filters-state"
import * as style from './bda-description-page.scss'
import * as moment from "moment";
import {MEDIUM_TIME_FORMAT} from "../../../../config/theme";
import HeinekenModule from "../../../../models/heineken-module";

interface DesriptionPageProps {
    rcfaBdaClientForm:RcfaBdaClientForm,
    boomFilters:BoomFiltersState
}

interface IState {
    active: boolean,
    checkCard: boolean,
    cardExist: boolean
}

@observer
export default class BdaDescriptionPage extends React.Component<DesriptionPageProps, IState> {

    public logic: DescriptionPageLogic;
    public form: HTMLFormElement | null = null;
    
    @observable private pageTitle:string = "Descripción";
    @observable public boomControl:BoomAutocomplete|null = null;
    

    constructor(props: any) {
        super(props);
        this.logic = new DescriptionPageLogic(this.props.rcfaBdaClientForm, this, this.props.boomFilters);
        this.state = {
            active: false,
            checkCard: false,
            cardExist: false
        }
    }

    async componentDidMount() {
        await this.logic.onComponentDidMount();
    }

    async handleFormSubmit(changeState:boolean){
        return await this.logic.handleFormSubmit(changeState);
    }
    private errorFor(field: string, customMessage?: string) {
        if (!this.logic.modelStateErrors) return null;
        const message = this.logic.validationMessageFor(field);
        if (!message || !message.length) return null;
        return (
            <div className={style.errorInline}>{customMessage ? customMessage : message}</div>
        );
    }

    private get boomCatalogue(){
        let data = this.logic.rcfaBdaClientForm;
        let active = (data.CurrentBdaStateId? (data.CurrentBdaStateId !== 1? true : false) :false)
        return(
            <div className={style.customBoom}>
                <BoomAutocomplete ref={x => this.logic.boomControl = x}
                    moduleName={HeinekenModule.BDA}
                    disabled={active}
                    hideSystem 
                    onDepartmentsChange={this.logic.onBoomDepartmentChange}
                    onWorkstationChange={this.logic.onBoomWorkstationChange}
                    onAreaChange={this.logic.onBoomAreaChange}
                    onMachineChange={this.logic.onBoomMachineChange}
                    horizontal={true}
                    hideQrScanner={true}
                    errors={{
                        workstation: this.errorFor('WorkstationId', 'Debe especificar una workstation'),
                        department: this.errorFor('DepartmentId', 'Debe especificar un departamento'),
                        area: this.errorFor('AreaId', 'Debe especificar un area'),
                        machine: this.errorFor('MachineId', 'Debe especificar una máquina'),
                        system: null,
                        maintenanceType: null
                    }}
                />
            </div>
        );
    }

    editBda() {
        if (this.state.active) {
            this.setState({ active: false });
            this.logic.rcfaBdaClientForm.EditStageId = 1;
        } else {
            this.setState({ active: true });
            this.logic.rcfaBdaClientForm.EditStageId = undefined;
        }
    }
    private get editButton() {

        return (
            <div className="row">
            <div className="col s12 m6 l6">
                <a id="btnEdit" className={`wave wave-light btn btnSave`} style={{ float: "left" }} onClick={(event) => this.editBda()}>Editar</a>
                </div>
            </div>
            
        );
    }
    private get cancelEditButton() {

        return (
            <div className="row">
                <div className="col s12 m6 l6">
                    <a id="btnCancelEdit" className={`wave wave-light btn btnCancel`} style={{ float: "left" }} onClick={(event) => this.editBda()}>Cancelar edición</a>
                </div>
            </div>

        );
    }

    render() {
        let data = this.logic.rcfaBdaClientForm;
        if (data.isEdit && !this.state.checkCard) {
            this.setState({
                active: (data.CurrentBdaStateId ? (data.CurrentBdaStateId !== 1 ? true : false) : false),
                checkCard: true
            });
        }
        let listNumber: Array<number> = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60];
        return (
            <div id="bdaDescriptionContent" className={"col s12 tabAnyBda"}>

                {(data.isEdit && this.state.active && data.CurrentBdaStateId != 1) ? this.editButton : ''}
                {(data.isEdit && !this.state.active && data.CurrentBdaStateId != 1) ? this.cancelEditButton : ''}
                <div className="row">
                    <div className="input-field col s12 m12 l12">
                        <textarea className={"materialize-textarea"}
                               disabled={this.state.active} 
                               name="Description" 
                               id="BdaDescription" 
                               onChange={(e)=> data.Description = e.currentTarget.value}
                               value={data.Description || ''}
                        />
                        <label className={"inputActive"} htmlFor="BdaDescription">Descripción</label>
                        {this.errorFor('Description', 'Debe especificar la descripción')}
                    </div>
                </div>
                <div className="row">
                    <div className="input-field col s12 m4 l4">
                        <i className="material-icons prefix">date_range</i>
                        <input disabled={true} 
                               id="BdaProblemStartDate" 
                               type="text" 
                               className="datepicker"
                               value={data.ProblemStartTimestamp ? moment(data.ProblemStartTimestamp).format('MMM DD, YYYY') : moment(new Date()).format("MMM DD, YYYY")} 
                        />
                        <label className="active" htmlFor="BdaProblemStartDate">Ingrese la fecha de incio del problema</label>
                        {this.errorFor('ProblemStartTimestamp', 'Debe especificar la fecha de inicio problema')}
                    </div>
                    <div className="input-field col s12 m4 l4">
                        <i className="material-icons prefix">access_time</i>
                        <input disabled={true} 
                               id="BdaProblemStartTime" 
                               type="text" 
                               className="timepicker" 
                            value={
                                data.ProblemStartTimestamp
                                    ? moment(data.ProblemStartTimestamp).format(MEDIUM_TIME_FORMAT)
                                    : moment().format(MEDIUM_TIME_FORMAT)
                            }
                        />
                        <label id="ReportTime_lbl" htmlFor="BdaProblemStartTime" className="active">Ingrese la hora de inicio del problema</label>
                        {this.errorFor('ProblemStartTimestamp', 'Debe especificar la hora de incio problema')}
                    </div>
                    <div className="input-field col s12 m2 l2">
                        <i className="material-icons prefix">hourglass_empty</i>
                        <select id={`TotalFalureTimeHours`} 
                                onChange={this.logic.handleTotalFalureTimeHoursChange} 
                                className={`select material-opt-in`} 
                                disabled={this.state.active} 
                                value={this.logic.rcfaBdaClientForm.TotalFalureTimeHours} >
                            <option key={`hours-page-select-status-${-1}`} value={undefined}>{'-'}</option>
                            {
                                listNumber.map((item) => {
                                    return (
                                        <option key={`hours-page-select-status-${item}`} value={item}>{item}</option>
                                    )
                                })
                            }
                        </select>
                        <label htmlFor="TotalFalureTimeHours" className={`active ${style.customTitle}`}>Ingrese el tiempo total de avería.</label>
                        <label htmlFor="TotalFalureTimeHours" className="active">horas</label>
                        {this.errorFor('TotalFalureTimeHours', 'Debe especificar las horas totales de avería')}
                    </div>
                    <div className="input-field col s12 m2 l2">
                        <i className="material-icons prefix">hourglass_empty</i>
                        <select id={`TotalFalureTimeMinutes`} 
                                onChange={this.logic.handleTotalFalureTimeMinutesChange} 
                                className={`select material-opt-in`} 
                                disabled={this.state.active} 
                                value={this.logic.rcfaBdaClientForm.TotalFalureTimeMinutes} >
                            <option key={`minutes-page-select-status-${-1}`} value={undefined}>{'-'}</option>
                            {
                                listNumber.map((item) => {
                                    return (
                                        <option key={`minutes-page-select-status-${item}`} value={item}>{item}</option>
                                    )
                                })
                            }
                        </select>
                        <label htmlFor="TotalFalureTimeMinutes" className="active">&nbsp;</label>
                        <label htmlFor="TotalFalureTimeMinutes" className="active">minutos</label>
                        {this.errorFor('TotalFalureTimeMinutes', 'Debe especificar los minutos totales de avería')}
                    </div>
                </div>
                <div className="row">
                    <div className="input-field col s12 m6 l6">
                        <div className={style.customXelect}>
                            <Xelect id="BdaOperatorEmployeeId"
                                    name="OperatorEmployeeId"
                                    multiple={false}
                                    getLabel={this.logic.getEmployeeLabel}
                                    getValue={this.logic.getEmployeeValue}
                                    getOptions={this.logic.filterEmployee}
                                    delay={500}
                                    values={this.logic.OperatorEmployeeId}
                                    onSelectionChange={(e) => {this.logic.handleOperatorEmployeeIdChange(e)}}
                                disabled={this.state.active}
                            />
                            <label>Ingrese el operador</label>
                            {this.errorFor('OperatorEmployeeId', 'Debe especificar al operador encargado del área')}
                        </div>
                    </div>
                    <div className="input-field col s12 m6 l6">
                        <div className={style.customXelect}>
                            <Xelect id="MechanicAssignedEmployeeId"
                                    name="MechanicAssignedEmployeeId"
                                    multiple={false}
                                    getLabel={this.logic.getEmployeeLabel}
                                    getValue={this.logic.getEmployeeValue}
                                    getOptions={this.logic.filterEmployee}
                                    delay={500}
                                    values={this.logic.MechanicAssignedEmployee}
                                    onSelectionChange={(e) => {this.logic.handleMechanicAssignedEmployeeIdChange(e)}}
                                    disabled={this.state.active}
                            />
                            <label>Ingrese el mecánico asignado</label>
                            {this.errorFor('MechanicAssignedEmployeeId', 'Debe especificar al operador encargado del área')}
                        </div>
                    </div>
                </div>
                <div className="row">
                    <div className="input-field col s12 m12 l12">
                        {this.boomCatalogue}
                    </div>
                </div>
                <div className="row">
                    <div className="input-field col s12 m12 l12">
                        <textarea className={"materialize-textarea"}
                               disabled={this.state.active} 
                               name="FunctionalFailureDescription" 
                               id="BdaFunctionalFailureDescription" 
                               onChange={(e)=> data.FunctionalFailureDescription = e.currentTarget.value}
                               value={data.FunctionalFailureDescription || ''}
                        />
                        <label className={"inputActive"} htmlFor="BdaFunctionalFailureDescription">Describa la falla funcional</label>
                        {this.errorFor('FunctionalFailureDescription', 'Debe especificar la descripción')}
                    </div>
                </div>
                <div className="row">
                    <div className="input-field col s12 m12 l12">
                        <textarea disabled={this.state.active} 
                            name="EarlyFailureIndicators"
                            className={"materialize-textarea"}
                               id="BdaEarlyFailureIndicators" 
                               onChange={(e)=> data.EarlyFailureIndicators = e.currentTarget.value}
                               value={data.EarlyFailureIndicators || ''}
                        />
                        <label className={"inputActive"} htmlFor="BdaEarlyFailureIndicators">Describa los signos previos a la averia</label>
                        {this.errorFor('EarlyFailureIndicators', 'Debe especificar la descripción')}
                    </div>
                </div>
            </div>
        );
    }
}