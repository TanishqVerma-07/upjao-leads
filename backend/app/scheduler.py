import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler(timezone="Asia/Kolkata")


def start_scheduler():
    from app.config import settings
    from app.services.sla import run_sla_check

    # Run at the top of every hour during the business window, Mon–Sat IST.
    # e.g. SLA_BIZ_START_H=9, SLA_BIZ_END_H=18 → fires at 09:00, 10:00 … 17:00 IST
    _scheduler.add_job(
        run_sla_check,
        CronTrigger(
            day_of_week="mon-sat",
            hour=f"{settings.SLA_BIZ_START_H}-{settings.SLA_BIZ_END_H - 1}",
            minute=0,
            timezone="Asia/Kolkata",
        ),
        id="sla_check",
        replace_existing=True,
        misfire_grace_time=300,
    )

    _scheduler.start()
    logger.info(
        "SLA scheduler started — runs hourly %02d:00–%02d:00 IST Mon–Sat",
        settings.SLA_BIZ_START_H,
        settings.SLA_BIZ_END_H,
    )


def stop_scheduler():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("SLA scheduler stopped")
