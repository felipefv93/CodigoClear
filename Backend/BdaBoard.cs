using Heineken.Factory.Applications.DataAccess;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Data.Entity.SqlServer;
using System.Linq;
using System.Transactions;
using System.Diagnostics;
using Heineken.Factory.Applications.API.Models.Rcfa.Bda;

namespace Heineken.Factory.Applications.Business.Rcfa.Bda
{
    public class BdaBoard: IDisposable
    {
        Lazy<IHeinekenFactoryDBModelDbContext> _lazyDataContext;
        IHeinekenFactoryDBModelDbContext _dataContext
        {
            get { return _lazyDataContext.Value; }
        }

        Lazy<StateMachineManager> _lazyStateMachineManager;
        StateMachineManager _stateMachineManager
        {
            get { return _lazyStateMachineManager.Value; }
        }

        public BdaBoard(Lazy<IHeinekenFactoryDBModelDbContext> dataContext)
        {
            if (dataContext == null)
                throw new ArgumentNullException(nameof(dataContext));

            _lazyDataContext = dataContext;
            _lazyStateMachineManager = new Lazy<StateMachineManager>(InitStateMachineManager, false);
        }

        private StateMachineManager InitStateMachineManager()
        {
            return new StateMachineManager(new BdaPhaseTransitionManager(this._dataContext));
        }

        public RcfaBdaPhaseTransitionValidationReport EvaluateStatusTransition(BdaDocument bda, Rcfa.State targetState)
        {
            if (bda == null)
                throw new ArgumentNullException(nameof(bda));

            FiveWhyAnalysis fiveWhy = null;
            if (bda.BdaForm.FiveWhyAnalysisId.HasValue)
            {
                var fiveWhyService = new FiveWhyService(_dataContext);
                fiveWhy = fiveWhyService.GetFiveWhyAnalysis(bda.BdaForm.FiveWhyAnalysisId.Value, true);
            }


            if (bda.CurrentState.Id == 3)
            {
                var obj = new CheckIfCanPassToCountermeassureStatusValidator();
                var resultValidator = obj.ValidateTransition(bda, fiveWhy);
                return new RcfaBdaPhaseTransitionValidationReport(bda.Id, resultValidator.CanBeApplied, resultValidator.Observations);
            }


            var stateMachine = _stateMachineManager.BuildStateMachine(bda, fiveWhy);
            var canGoToState = stateMachine.CanGoToState(targetState);
            return new RcfaBdaPhaseTransitionValidationReport(bda.Id, canGoToState, bda.LastObservations);

        }

        public IEnumerable<BdaFormCountByStatus> GetCardCountByStatus()
        {
            var queryAll = _lazyDataContext.Value.BdaStateFormCounts;
            return queryAll
                .ToArray()
                .Select(dc => new BdaFormCountByStatus(dc))
                .ToArray();
        }

        public BdaDocument CreateBda(DataAccess.BdaForm form)
        {
            if (form == null)
                throw new ArgumentNullException(nameof(form));

            using (var tranScope = new TransactionScope(TransactionScopeOption.RequiresNew, TransactionScopeAsyncFlowOption.Enabled))
            {
                form.CurrentBdaStateId = 1;
                form.ExpectedFollowUpWeekCount = 24;
                _dataContext.BdaForm.Add(form);
                _dataContext.SaveChanges();

                var dasDoc = this.GetBdaDocument(form.Id, true);

                var initialFlowStep = dasDoc.GetInitialFlowHistoryItem();
                var toState = initialFlowStep.ToState;
                form.BdaFlowStepHistories.Add(new BdaFlowStepHistory
                {
                    BdaFlowStepId = null,
                    BdaFormId = form.Id,
                    EventTimestamp = DateTime.UtcNow,
                    FromBdaStateId = null,
                    ToBdaStateId = toState.Id
                });
                _dataContext.SaveChanges();
                tranScope.Complete();
                return dasDoc;
            }
        }

        public BdaDocument GetBdaDocument(int bdaFormId, bool buildStateMachine)
        {
            var allRels = GetBdaFormAllRelationshipsQuery();

            var dbBdaDoc = allRels
                .Where(f => f.Id == bdaFormId)
                .FirstOrDefault();

            if (dbBdaDoc == null)
            {
                throw new ClientDataNotFoundException(Subsystems.RCFA,
                    typeof(DataAccess.BdaForm), bdaFormId);
            }

            var bdaDoc = new BdaDocument(dbBdaDoc);
            if (buildStateMachine)
            {
                FiveWhyAnalysis fiveWhy = null;
                
                var stateMachine = _stateMachineManager.BuildStateMachine(bdaDoc, fiveWhy);
                bdaDoc.StateMachine = stateMachine;
            }

            return bdaDoc;
        }

        private IQueryable<BdaForm> GetBdaFormAllRelationshipsQuery()
        {
            return _dataContext.BdaForm
                .Include(f => f.CurrentState)
                .Include(f => f.BdaFlowStepHistories)
                .Include(f => f.MechanicAssignedEmployee)
                .Include(f => f.OperatorEmployee)
                .Include(f => f.Department)
                .Include(f => f.Area)
                .Include(f => f.Workstation)
                .Include(f => f.Machine)
                .Include(f => f.ChangedComponents)
                .Include(f => f.ChangedComponents.Select(cc => cc.PartNumberBlob))
                .Include(f => f.RepairEvidenceBlob)
                .Include(f => f.FiveWhyParticipants)
                .Include(f => f.FiveWhyParticipants.Select(bdafwp=> bdafwp.Employer))
                ;
        }

        public BdaDocument UpdateDbFields(BdaDocument bdaDoc, BdaClientForm updatedFormData)
        {
            if (bdaDoc == null)
                throw new ArgumentNullException(nameof(bdaDoc));

            if (updatedFormData == null)
                throw new ArgumentNullException(nameof(updatedFormData));

            bdaDoc.UpdateFields(updatedFormData, _dataContext);
            _dataContext.SaveChanges();

            return bdaDoc;
        }

        public BdaDocument CancelBda(BdaDocument bdaDoc, BdaCancelModel model)
        {
            if (bdaDoc == null)
                throw new ArgumentNullException(nameof(bdaDoc));

            bdaDoc.BdaForm.CurrentBdaStateId = (int)RcfaStates.Cancel;
            bdaDoc.BdaForm.CancelledByEmployee = model.WhoId;
            bdaDoc.BdaForm.CancelledDate = DateTime.Now;
            bdaDoc.BdaForm.CancelledOrEliminatedReason = model.Why;
            bdaDoc.BdaForm.FailureAndRepairDescription = "";

            _dataContext.SaveChanges();

            return bdaDoc;
        }
        public BdaDocument CloseBda(BdaDocument bdaDoc, BdaCancelModel model)
        {
            if (bdaDoc == null)
                throw new ArgumentNullException(nameof(bdaDoc));

            bdaDoc.BdaForm.CurrentBdaStateId = (int)RcfaStates.Close;
            bdaDoc.BdaForm.BdaFinishedDate = DateTime.Now;
            bdaDoc.BdaForm.GoodPracticeFileName = model.GoodPracticeFileName;

            _dataContext.SaveChanges();

            return bdaDoc;
        }
        public BdaDocument NoApplyGPBda(BdaDocument bdaDoc, BdaNoApplyGPModel model)
        {
            if (bdaDoc == null)
                throw new ArgumentNullException(nameof(bdaDoc));

            bdaDoc.BdaForm.CurrentBdaStateId = (int)RcfaStates.Close;
            bdaDoc.BdaForm.BdaFinishedDate = DateTime.Now;
            bdaDoc.BdaForm.NoApplyGP = true;
            bdaDoc.BdaForm.ReasonNoApplyGP = model.Why;

            _dataContext.SaveChanges();

            return bdaDoc;
        }
        public void ChangeState(BdaDocument bdaDoc, State targetState)
        {
            if (bdaDoc == null)
                throw new ArgumentNullException(nameof(bdaDoc));

            if (targetState == null)
                throw new ArgumentNullException(nameof(targetState));

            if (!bdaDoc.StateMachine.CanGoToState(targetState))
                throw new BusinessException(Subsystems.RCFA, InternalException.Context.InvalidData);

            using (var transScope = new TransactionScope(TransactionScopeOption.RequiresNew, TransactionScopeAsyncFlowOption.Enabled))
            {
                var transition = bdaDoc.StepToState(targetState);
                _dataContext.SaveChanges();
                transScope.Complete();
            }
        }

        public IEnumerable<RcfaStatusCard> GetVisibleCards(BdaStatusBoardQuery boardQuery, bool page)
        {
            if (boardQuery == null)
                throw new ArgumentNullException(nameof(boardQuery));

            var pagedQuery = boardQuery.GenerateFilter(_dataContext.BdaForm, true, page);
            IQueryable<RcfaStatusCard> projectionQuery = ProjectBdaFormToCard(pagedQuery);

            var projectionResult = projectionQuery.ToArray();
            ComputeExtraCardData(projectionResult);
            return projectionResult;
        }

        public IEnumerable<RcfaStatusExportCard> GetVisibleCardsExport(BdaStatusBoardQuery boardQuery)
        {
            if (boardQuery == null)
                throw new ArgumentNullException(nameof(boardQuery));

            var pagedQuery = boardQuery.GenerateFilter(_dataContext.BdaForm, true, false);
            List<RcfaStatusExportCard> projectionQueryExport = ProjectBdaFormToCardExport(pagedQuery);
            var cards = GetVisibleCards(boardQuery, false);
            foreach (var card in projectionQueryExport)
            {
                var find = cards.Where(x => x.BdaFormId == card.BdaFormId).FirstOrDefault();
                if (find != null)
                {
                    card.IsImperative = find.IsImperative;
                    card.DelayedTime = find.DelayedTime;
                }
            }
            return projectionQueryExport;
        }
        private IQueryable<RcfaStatusCard> ProjectBdaFormToCard(IQueryable<BdaForm> pagedQuery)
        {
            var nowUtc = DateTime.UtcNow.Date;
            var projectionQuery = from f in pagedQuery
                                  let state = f.CurrentBdaStateId
                                  let hasFinishedDate = f.BdaFinishedDate != null

                                  join dfStepHistory in _dataContext.BdaFlowStepHistories
                                    .OrderByDescending(dfh => dfh.EventTimestamp)

                                  on f.Id equals dfStepHistory.BdaFormId
                                  into form_dfStepHistory

                                  join dfStepHistory in _dataContext.BdaFlowStepHistories
                                    .OrderBy(dfh => dfh.EventTimestamp)

                                  on f.Id equals dfStepHistory.BdaFormId
                                  into form_dfStepHistoryAsc

                                  let totalTolerableTime = _dataContext.BdaState.Where(x => x.Id <= state).Sum(x => x.TolerableProcessTime)

                                  let coordinator = _dataContext.Employer.Where(x => x.Id == f.Area.CoordinatorEmployeeId).FirstOrDefault()

                                  let finishDate = hasFinishedDate ? f.BdaFinishedDate.Value : nowUtc
                                  let totalHours = SqlFunctions.DateDiff("hour", f.ProblemStartTimestamp, finishDate)

                                  let lastStepHistory = form_dfStepHistory.FirstOrDefault()
                                  let firstStepHistory = form_dfStepHistoryAsc.FirstOrDefault()
                                  let dateStartCurrentState = lastStepHistory != null ? lastStepHistory.EventTimestamp : nowUtc
                                  let dateStartBDA = firstStepHistory != null ? firstStepHistory.EventTimestamp : nowUtc

                                  let problemStartDate = f.ProblemStartTimestamp != null? f.ProblemStartTimestamp.Value: f.CreatedTimestamp
                                  let blob = _dataContext.Blob.Where(x => x.Id == f.ClosedBlobId).FirstOrDefault()

                                  select new RcfaStatusCard
                                  {
                                      BdaFormId = f.Id,
                                      CreationDate = f.CreatedTimestamp,
                                      CreatorDisplayName = f.OperatorEmployee.Name,
                                      ProblemStartDate = problemStartDate,
                                      FormFinalizedDate = f.BdaFinishedDate,
                                      FlowState = (RcfaStates)state,
                                      RecurrenceCount = f.RecurrenceLogs.Count(),
                                      Department = f.Department.Name,
                                      AreaName = f.Area.Name,
                                      AreaId = (int)f.AreaId,
                                      MachineName = f.Machine.Name,
                                      ProblemDescription = f.FunctionalFailureDescription,
                                      DefectMode = f.FailureModeDescription,
                                      DaysBeforeImperative = f.CurrentState.TolerableProcessTime,
                                      CurrentStateStartDate = dateStartCurrentState,
                                      StartBDADate = dateStartBDA,
                                      IsImperative = false, //this is computed after database query
                                      TotalDurationTime = totalHours.HasValue ? totalHours.Value : 0,
                                      IsLifecycleComplete = f.CurrentBdaStateId >= 6, //this is computed after db query
                                      TotalTolerableTime = totalTolerableTime,
                                      CoordinatorEmail = coordinator != null ? coordinator.Email : "",
                                      CoordinatorName = coordinator != null ? coordinator.Name : "",
                                      TotalFalureTimeHours = f.TotalFalureTimeHours,
                                      TotalFalureTimeMinutes = f.TotalFalureTimeMinutes,
                                      ClosedBlobId = f.ClosedBlobId != null ? f.ClosedBlobId.Value : 0,
                                      GoodPracticeFileName = f.GoodPracticeFileName,
                                      GoodPracticeUri = blob != null ? blob.Uri : null,
                                      NoApplyGP = f.NoApplyGP,
                                      ReasonNoApplyGP= f.ReasonNoApplyGP,
                                  };
            return projectionQuery;
        }
        private List<RcfaStatusExportCard> ProjectBdaFormToCardExport(IQueryable<BdaForm> pagedQuery)
        {
            try
            {
                var bda = pagedQuery.ToArray();
                var states = _dataContext.BdaState.ToList();
                var nowUtc = DateTime.UtcNow.Date;
                var projectionQuery = from f in pagedQuery
                                      let state = f.CurrentBdaStateId
                                      let hasFinishedDate = f.BdaFinishedDate != null

                                      join dfStepHistory in _dataContext.BdaFlowStepHistories
                                        .OrderByDescending(dfh => dfh.EventTimestamp)

                                      on f.Id equals dfStepHistory.BdaFormId
                                      into form_dfStepHistory

                                      let finishDate = hasFinishedDate ? f.BdaFinishedDate.Value : nowUtc
                                      let totalHours = SqlFunctions.DateDiff("hour", f.ProblemStartTimestamp, finishDate)

                                      let lastStepHistory = form_dfStepHistory.FirstOrDefault()
                                      let dateStartCurrentState = lastStepHistory != null ? lastStepHistory.EventTimestamp : nowUtc

                                      let problemStartDate = f.ProblemStartTimestamp != null ? f.ProblemStartTimestamp.Value : f.CreatedTimestamp
                                      let personsAnalysis = f.FiveWhyParticipants.Select(x => x.Employer.Name)

                                      select new RcfaStatusExportCard
                                      {
                                          BdaFormId = f.Id,
                                          CreationDate = f.CreatedTimestamp,
                                          RecurrenceCount = f.RecurrenceLogs.Count(),
                                          Department = f.Department.Name,
                                          AreaName = f.Area.Name,
                                          DefectMode = f.FailureModeDescription,
                                          CurrentStage = f.CurrentState.Name,
                                          FailureAndRepairDescription = f.FailureAndRepairDescription,
                                          MechanicAssignedEmployeeId = f.MechanicAssignedEmployeeId.HasValue ? f.MechanicAssignedEmployeeId.Value : 0,
                                          MechanicAssignedEmployee = f.MechanicAssignedEmployeeId.HasValue ? f.MechanicAssignedEmployee.Name : "",
                                          PersonsAnalysis = personsAnalysis.ToList(),
                                          RepairTimeHours = f.RepairTimeHours.HasValue ? f.RepairTimeHours.Value : 0,
                                          RepairTimeMinutes = f.RepairTimeMinutes.HasValue ? f.RepairTimeMinutes.Value : 0,
                                          Workstation = f.Workstation.Name,
                                          FiveWhyAnalysis = f.FiveWhyAnalysis.FiveWhyCountermeasures.Count,
                                          FunctionalFailureDescription = f.FunctionalFailureDescription,
                                          FinishedDate = f.BdaFinishedDate
                                      };

                var bdas = projectionQuery.ToArray();
                bdas = bdas.Where(x => x.CurrentStage != "Cancel").ToArray();
                var bdasCounter = bda.Where(x => x.FiveWhyAnalysisId.HasValue && x.FiveWhyAnalysis.FiveWhyCountermeasures.Where(y => !y.Verified).Count() > 0).Select(x => x.Id).ToList();
                var bdasCountermeasures = bdas.Where(x => bdasCounter.Contains((int)x.BdaFormId)).ToList();
                foreach (var b in bdas)
                {
                    var ba = bda.Where(x => x.Id == b.BdaFormId).First();
                    if (ba == null)
                        continue;
                    var id = ba.Id;
                    var totalDays = states.Select(x => x.TolerableProcessTime).Sum();
                    var currentDays = states.Where(x => x.Id <= ba.CurrentBdaStateId).Select(x => x.TolerableProcessTime).Sum();
                    b.DateAproxFinish = ba.BdaFlowStepHistories.FirstOrDefault().EventTimestamp.AddDays(totalDays);
                    b.DateCurrentAproxFinish = ba.BdaFlowStepHistories.FirstOrDefault().EventTimestamp.AddDays(currentDays);
                    b.StartDate = ba.BdaFlowStepHistories.FirstOrDefault().EventTimestamp;
                }
                foreach (var b in bdasCountermeasures)
                {
                    var ba = bda.Where(x => x.Id == b.BdaFormId).First();
                    if (ba == null)
                        continue;

                    if (ba.FiveWhyAnalysisId.HasValue)
                    {
                        var countermeasures = ba.FiveWhyAnalysis.FiveWhyCountermeasures;
                        int count = 0;
                        countermeasures = countermeasures.Where(x => !x.Verified).Take(3).ToList();
                        if (countermeasures.Count() == 0)
                            continue;

                        foreach(var counter in countermeasures)
                        {
                            if (count == 3)
                                break;

                            
                            if (!counter.Verified)
                            {
                                switch (count)
                                {
                                    case 0:
                                        {
                                            b.ResponsablesCountermeasure1 = counter.ResponsibleEmployees.Select(x => x.ResponsibleEmployee.Name).ToList();
                                            count++;
                                            break;
                                        }
                                    case 1:
                                        {
                                            b.ResponsablesCountermeasure2 = counter.ResponsibleEmployees.Select(x => x.ResponsibleEmployee.Name).ToList();
                                            count++;
                                            break;
                                        }
                                    case 2:
                                        {
                                            b.ResponsablesCountermeasure3 = counter.ResponsibleEmployees.Select(x => x.ResponsibleEmployee.Name).ToList();
                                            count++;
                                            break;
                                        }
                                }
                                
                            }
                        }

                    }
                }
                return bdas.ToList();
            }
            catch(Exception ex)
            {
                return null;
            }
            
        }

        public Rcfa.RecurrenceLogItem MarkRecurrence(int bdaFormId, RecurrenceLogItem recurrenceData)
        {
            //Se crea el registro de recurrencia
            var dbRecurrenceLogItem = new BdaRecurrenceLog
            {
                BdaFormId = bdaFormId,
                MarkedAtDate = recurrenceData.MarkedAtDate,
                MarkedByEmployeeId = recurrenceData.MarkedByEmployeeId
            };

            _dataContext.BdaRecurrenceLogs.Add(dbRecurrenceLogItem);
            var bda = _dataContext.BdaForm.FirstOrDefault(x => x.Id == bdaFormId);
            bda.CurrentBdaStateId = 3;

            _dataContext.SaveChanges();
            var dbEntry = _dataContext.Entry(dbRecurrenceLogItem);
            if (!dbEntry.Reference(dbe => dbe.MarkedByEmployee).IsLoaded)
                dbEntry.Reference(dbe => dbe.MarkedByEmployee).Load();

            this.SetWeekFolloupLog(bdaFormId);

            return new RecurrenceLogItem(dbRecurrenceLogItem);
        }

        private void SetWeekFolloupLog(int bdaFormId)
        {
            var iteracion = 1;

            var objBdaForm = _dataContext.BdaForm.Include(df => df.BdaFlowStepHistories)
                                                 .FirstOrDefault(itm => itm.Id == bdaFormId);
            if(objBdaForm == null || objBdaForm.Id == 0)
                return;

            var fechaSemana = objBdaForm.BdaFlowStepHistories.Where(itm => itm.ToBdaStateId == 5)
                                                             .Select(itm => itm.EventTimestamp)
                                                             .FirstOrDefault();

            if (fechaSemana == DateTime.MinValue)
                return;

            var obj = _dataContext.BdaFollowUpLogs.Where(itm => itm.BdaFormId == bdaFormId);
            _dataContext.BdaFollowUpLogs.RemoveRange(obj);
            _dataContext.SaveChanges();

            var fechaFinDeSemana = ClsWeekOfYear.WeekOfDate(DateTime.Now).EndDate.AddDays(1);
            while (fechaSemana < fechaFinDeSemana)
            {
                var objClsModelWeekOfYear = ClsWeekOfYear.WeekOfDate(fechaSemana);
                var recurrencesInWeek = _dataContext.BdaRecurrenceLogs.Where(itm => itm.BdaFormId == bdaFormId &&
                                                                                    itm.MarkedAtDate >= objClsModelWeekOfYear.StartDate &&
                                                                                    itm.MarkedAtDate <= objClsModelWeekOfYear.EndDate).ToList();
                var hasRecurrenceInWeek = recurrencesInWeek.Any();
                var recurrencesNumberInWeek = hasRecurrenceInWeek ? recurrencesInWeek.Count() : 0;

                var bdaFollowUpLog = _dataContext.BdaFollowUpLogs.FirstOrDefault(itm => itm.BdaFormId == bdaFormId &&
                                                                                        itm.FollowUpWeekNumber == iteracion);

                if (bdaFollowUpLog != null && bdaFollowUpLog.Id > 0)
                {
                    bdaFollowUpLog.HadRecurrence = hasRecurrenceInWeek;
                    bdaFollowUpLog.RecurrencesNumber = (short)recurrencesNumberInWeek;
                    bdaFollowUpLog.StartWeek = objClsModelWeekOfYear.StartDate;
                    bdaFollowUpLog.EndWeek = objClsModelWeekOfYear.EndDate;
                }
                else
                {
                    _dataContext.BdaFollowUpLogs.Add(new BdaFollowUpLog()
                    {
                        BdaFormId = bdaFormId,
                        HadRecurrence = hasRecurrenceInWeek,
                        FollowUpWeekNumber = (short)iteracion,
                        RecurrencesNumber = (short)recurrencesNumberInWeek,
                        StartWeek = objClsModelWeekOfYear.StartDate,
                        EndWeek = objClsModelWeekOfYear.EndDate
                    });
                }

                iteracion++;
                fechaSemana = objClsModelWeekOfYear.NextWeek;
            }

            objBdaForm.FollowUpWeekCount = iteracion - 1;

            _dataContext.SaveChanges();
        }

        public BdaDocument GetBdaDocumentByFiveWhy(int fiveWhyId, bool buildStateMachine, bool failOnNotFound)
        {
            var nonHistoryFullDocQuery = GetBdaFormAllRelationshipsQuery();

            var dbBdaDoc = nonHistoryFullDocQuery
                .Where(f => f.FiveWhyAnalysisId == fiveWhyId)
                .FirstOrDefault();

            if (dbBdaDoc == null)
            {
                if (failOnNotFound)
                {
                    throw new ClientDataNotFoundException(Subsystems.RCFA,
                    typeof(DataAccess.FiveWhyAnalysis), fiveWhyId);
                }
                else return null;
            }

            var bdaDoc = new BdaDocument(dbBdaDoc);
            if (buildStateMachine)
            {
                FiveWhyAnalysis fiveWhy = null;
                if (bdaDoc.BdaForm.FiveWhyAnalysisId.HasValue)
                {
                    var fiveWhyServ = new FiveWhyService(_dataContext);
                    fiveWhy = fiveWhyServ.GetFiveWhyAnalysis(bdaDoc.BdaForm.FiveWhyAnalysisId.Value, true);
                }
                var stateMachine = _stateMachineManager.BuildStateMachine(bdaDoc, fiveWhy);
                bdaDoc.StateMachine = stateMachine;
            }

            return bdaDoc;
        }

        public IEnumerable<Rcfa.RecurrenceLogItem> GetRecurrenceLog(int bdaFormId)
        {
            var query = _dataContext.BdaRecurrenceLogs
                .Include(rl => rl.MarkedByEmployee)
                .Where(rl => rl.BdaFormId == bdaFormId)
                .OrderBy(rl => rl.Id);

            var dbRecurrenceLogs = query.ToArray();
            var recurrenceLogItems = dbRecurrenceLogs.Select(rl => new Rcfa.RecurrenceLogItem(rl)).ToArray();
            return recurrenceLogItems;
        }

        public IEnumerable<Rcfa.FollowUpWeek> GetFollowUpWeeks(int bdaFormId)
        {
            IOrderedQueryable<BdaFollowUpLog> query = GetFollowupWeeksQuery(bdaFormId);

            var dbFollowUpWeeks = query.ToArray();
            var followpWeeks = dbFollowUpWeeks.Select(fuw => new FollowUpWeek(fuw)).ToArray();
            return followpWeeks;
        }
        private IOrderedQueryable<BdaFollowUpLog> GetFollowupWeeksQuery(int bdaFormId)
        {
            return _dataContext.BdaFollowUpLogs
                                .Where(dfl => dfl.BdaFormId == bdaFormId)
                                .OrderBy(dfl => dfl.FollowUpWeekNumber);
        }

        public BdaClientFormChangedComponent CreateEmptyChangedComponent(int bdaFormId)
        {
            var dbComponent = new DataAccess.BdaChangedComponent
            {
                BdaFormId = bdaFormId
            };
            _dataContext.BdaChangedComponents.Add(dbComponent);
            _dataContext.SaveChanges();

            return new BdaClientFormChangedComponent
            {
                Id = dbComponent.Id,
            };
        }

        public bool DeleteChangedComponent(int BdaChangedComponentsId)
        {
            try
            {
                var dbComponent = _dataContext.BdaChangedComponents.FirstOrDefault(itm=> itm.Id == BdaChangedComponentsId);

                if (dbComponent.Id > 0)
                {
                    _dataContext.BdaChangedComponents.Remove(dbComponent);
                    _dataContext.SaveChanges();
                }

                return true;
            }
            catch (Exception ex)
            {
                Trace.TraceError(ex.Message);
                return false;
            }
        }

        private void ComputeExtraCardData(IEnumerable<RcfaStatusCard> cards)
        {
            if (cards == null)
                throw new ArgumentNullException(nameof(cards));

            foreach (var card in cards)
            {
                card.IsImperative = BdaDocument.IsImperative(card);
                card.IsLifecycleComplete = BdaDocument.IsLifecycleComplete(card);
            }
        }

        private IQueryable<BdaForm> IncludeAllPropertiesInQuery(IQueryable<BdaForm> query)
        {
            if (query == null)
                throw new ArgumentNullException(nameof(query));

            return query
                .Include(f => f.Area)
                .Include(f => f.Department)
                .Include(f => f.Machine)
                .Include(f => f.OperatorEmployee)
                .Include(f => f.Workstation)
                .Include(f => f.FiveWhyParticipants)
                .Include(f => f.FiveWhyParticipants.Select(x => x.Employer))
                ;
        }

        private void BuildDasDocStateMachine(bool buildStateMachine, BdaDocument BdaDoc)
        {
            if (buildStateMachine)
            {
                FiveWhyAnalysis fiveWhy = null;
                if (BdaDoc.BdaForm.FiveWhyAnalysisId.HasValue)
                {
                    var fiveWhyServ = new FiveWhyService(_dataContext);
                    fiveWhy = fiveWhyServ.GetFiveWhyAnalysis(BdaDoc.BdaForm.FiveWhyAnalysisId.Value, true);
                }
                var stateMachine = _stateMachineManager.BuildStateMachine(BdaDoc, fiveWhy);
                BdaDoc.StateMachine = stateMachine;
            }
        }

        public IReadOnlyList<BdaDocument> GetDasDocuments(IEnumerable<int> bdaFormIds, bool buildStateMachine)
        {
            if (bdaFormIds == null)
                throw new ArgumentNullException(nameof(bdaFormIds));
            bdaFormIds = new SortedSet<int>(bdaFormIds);

            var nonHistoryFullDocQuery = IncludeAllPropertiesInQuery(_dataContext.BdaForm);

            var dbBdaDocs = (from a in nonHistoryFullDocQuery
                             join dfi in bdaFormIds
                             on a.Id equals dfi
                             select a).ToArray();

            var bdaDocs = dbBdaDocs.Select(x => {
                var bdaDoc = new BdaDocument(x);
                BuildDasDocStateMachine(buildStateMachine, bdaDoc);
                return bdaDoc;
            }).ToArray();

            return bdaDocs;
        }

        #region IDisposable Support
        private bool disposedValue = false; 

        protected virtual void Dispose(bool disposing)
        {
            if (!disposedValue)
            {
                if (disposing)
                {
                    try
                    {
                        if (_lazyDataContext.IsValueCreated && _lazyDataContext.Value != null)
                            _lazyDataContext.Value.Dispose();
                    }
                    catch (ObjectDisposedException)
                    {
                    }
                }


                disposedValue = true;
            }
        }


        public void Dispose()
        {
            Dispose(true);
        }
        #endregion


    }
}
