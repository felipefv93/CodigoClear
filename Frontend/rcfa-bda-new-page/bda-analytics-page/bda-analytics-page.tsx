import * as React from 'react';
import * as moment from "moment";
import { observer } from 'mobx-react';
import * as style from './bda-analytics-page.scss'
import AnalyticsLogic from './bda-analytics-page-logic';
import { RcfaBdaClientForm } from 'ClientApp/models/rcfa-bda-form';
import RootCauseAnalyzer from '../../../common/root-cause-analyzer/root-cause-analyzer';
import Xelect from '../../../../lib/components/xelect/xelect';

interface AnalyticsPageProps {
    rcfaBdaClientForm:RcfaBdaClientForm;
}

interface IState {
    active: boolean,
    checkCard: boolean,
    cardExist: boolean,
    modelStateErrors: any,
    displayValidationErrors: boolean,
}
@observer
export default class BdaAnalyticsPage extends React.Component<AnalyticsPageProps, IState> {

    public logic: AnalyticsLogic;

    constructor(props: any) {
        super(props);
        this.logic = new AnalyticsLogic(this.props.rcfaBdaClientForm, this);

        this.state = {
            modelStateErrors: null,
            displayValidationErrors: false,
            active: false,
            checkCard: false,
            cardExist: false
        };
    }

    componentDidMount() {
        this.logic.onComponentDidMount();
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

    editBda() {
        if (this.state.active) {
            this.setState({ active: false });
            this.logic.rcfaBdaClientForm.EditStageId = 3;
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
                active: (data.CurrentBdaStateId ? (data.CurrentBdaStateId !== 3 ? true : false) : false),
                checkCard: true
            });
        }
        return (
            <div id="bdaanalytics" style={{ display: "none" }} className={"col s12 tabAnyBda"}>
                {(data.isEdit && this.state.active && data.CurrentBdaStateId != 3) ? this.editButton : ''}
                {(data.isEdit && !this.state.active && data.CurrentBdaStateId != 3) ? this.cancelEditButton : ''}
                <div className="row">
                    <div className="input-field col s12 m6 l8">
                        <div className={style.customXelect}>
                            <Xelect id="AnaliticsPeople"
                                    name="AnaliticsPeople"
                                    multiple={true}
                                    getLabel={this.logic.getEmployeeLabel}
                                    getValue={this.logic.getEmployeeValue}
                                    getOptions={this.logic.filterEmployee}
                                    delay={500}
                                    values={this.logic.AnaliticsPeopleEmployee}
                                    disabled={this.state.active}
                            />
                            <label htmlFor="AnaliticsPeople">Personas que analizán:</label>
                        </div>
                        {this.errorFor('AnaliticsPeople', 'Debe especificar las personas que analzán')}
                    </div>
                    <div className="input-field col s12 m6 l4">
                        <i className="material-icons prefix">date_range</i>
                        <input disabled={this.state.active} 
                               id="AnalyticsDate" 
                               type="text" 
                               className="datepicker"
                               value={data.AnalyticsDate ? moment(data.AnalyticsDate).format('MMM DD, YYYY') : ''} 
                        />
                        <label className="active" htmlFor="ReportDate">Fecha</label>
                        {this.errorFor('AnalyticsDate', 'Debe especificar la fecha')}
                    </div>
                </div>
                <div className="row">
                    <div className="col s12 m12 l12">
                        {
                            this.logic.fiveWhyAnalysis != null?
                                <RootCauseAnalyzer fiveWhyAnalysis={this.logic.fiveWhyAnalysis}  
                                                   ref={x => { this.logic.rootCauseAnalyzer = x; }} 
                                                   disable={this.state.active}
                                />
                            :
                                null
                        }
                    </div>
                </div>
            </div>
        );
    }
}