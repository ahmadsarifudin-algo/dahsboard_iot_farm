"""
Sites API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models import Site, Device
from app.schemas import SiteCreate, SiteUpdate, SiteResponse, SiteWithDevices

router = APIRouter(prefix="/sites", tags=["Sites"])


@router.get("", response_model=list[SiteResponse])
async def list_sites(
    region: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """List all sites with optional region filter."""
    query = select(Site)
    
    if region:
        query = query.where(Site.region == region)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    sites = result.scalars().all()
    
    # Get device counts
    response = []
    for site in sites:
        count_query = select(func.count(Device.id)).where(Device.site_id == site.id)
        count_result = await db.execute(count_query)
        device_count = count_result.scalar() or 0
        
        site_data = SiteResponse.model_validate(site)
        site_data.device_count = device_count
        response.append(site_data)
    
    return response


@router.get("/{site_id}", response_model=SiteWithDevices)
async def get_site(site_id: str, db: AsyncSession = Depends(get_db)):
    """Get site details with devices."""
    result = await db.execute(select(Site).where(Site.id == site_id))
    site = result.scalar_one_or_none()
    
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    return site


@router.post("", response_model=SiteResponse, status_code=201)
async def create_site(site_data: SiteCreate, db: AsyncSession = Depends(get_db)):
    """Create a new site."""
    site = Site(**site_data.model_dump())
    db.add(site)
    await db.flush()
    await db.refresh(site)
    
    response = SiteResponse.model_validate(site)
    response.device_count = 0
    return response


@router.patch("/{site_id}", response_model=SiteResponse)
async def update_site(
    site_id: str, 
    site_data: SiteUpdate, 
    db: AsyncSession = Depends(get_db)
):
    """Update a site."""
    result = await db.execute(select(Site).where(Site.id == site_id))
    site = result.scalar_one_or_none()
    
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    update_data = site_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(site, key, value)
    
    await db.flush()
    await db.refresh(site)
    return site


@router.delete("/{site_id}", status_code=204)
async def delete_site(site_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a site."""
    result = await db.execute(select(Site).where(Site.id == site_id))
    site = result.scalar_one_or_none()
    
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    await db.delete(site)


@router.get("/map/data")
async def get_sites_map_data(db: AsyncSession = Depends(get_db)):
    """Get minimal site data for map display."""
    query = select(Site.id, Site.name, Site.latitude, Site.longitude, Site.region)
    result = await db.execute(query)
    sites = result.all()
    
    # Get device counts per site
    count_query = select(
        Device.site_id,
        func.count(Device.id).label("device_count"),
        func.count(Device.id).filter(Device.status == "online").label("online_count")
    ).group_by(Device.site_id)
    
    count_result = await db.execute(count_query)
    counts = {row.site_id: {"total": row.device_count, "online": row.online_count} for row in count_result}
    
    return [
        {
            "id": site.id,
            "name": site.name,
            "lat": site.latitude,
            "lng": site.longitude,
            "region": site.region,
            "devices": counts.get(site.id, {"total": 0, "online": 0})
        }
        for site in sites
    ]
