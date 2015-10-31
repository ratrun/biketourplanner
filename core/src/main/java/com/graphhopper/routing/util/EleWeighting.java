package com.graphhopper.routing.util;

import com.graphhopper.util.DistanceCalc;
import com.graphhopper.util.EdgeIteratorState;
import com.graphhopper.storage.NodeAccess;
import com.graphhopper.util.Helper;
import com.graphhopper.util.PMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * This Class uses edge elevation difference for edge avoidence or for edge preference.
 */
public class EleWeighting extends PriorityWeighting
{

    private static final Logger logger = LoggerFactory.getLogger(EleWeighting.class);

    private final FlagEncoder flagEncoder;
    
    private final NodeAccess nodeAccess;
    
    private final Weighting superWeighting;    

    private final DistanceCalc distCalc = Helper.DIST_EARTH;
    
    // ascendAvoidance: 0 = don't include elevation to the weighting at all
    // 1.0 avoid ascends by choosing long de-tours 
    // -1.0 search for ascends

    private double ascendAvoidance;

    public EleWeighting( FlagEncoder flagEncoder, PMap pMap, NodeAccess nodeAccess)
    {
        super(flagEncoder, pMap);
        this.superWeighting = new PriorityWeighting(flagEncoder, pMap);
        ascendAvoidance = pMap.getDouble("ascendAvoidance", 0.0);
        //ascendAvoidance = pMap.getDouble("ascendAvoidance", 1.0);
        
        this.flagEncoder = flagEncoder;
        this.nodeAccess = nodeAccess;
    }
    
    @Override
    public double calcWeight( EdgeIteratorState edgeState, boolean reverse, int prevOrNextEdgeId )
    {
        double weight = superWeighting.calcWeight(edgeState, reverse, prevOrNextEdgeId);
        if (ascendAvoidance == 0)
            return weight;
        else
        {
            // FIXME: Speed calculation in calcmillis
            return applyEle( edgeState, weight, reverse );
        }
    }
    
    @Override
    public double getMinWeight( double distance )
    {
        return superWeighting.getMinWeight(distance);
    }

    @Override
    public FlagEncoder getFlagEncoder()
    {
        return flagEncoder;
    }

    @Override
    public String toString()
    {
        return "elevation";
    }
    
    /* 
    
    FIXME: - need one bit in flags 
        if (way.hasTag("tunnel", "yes") || way.hasTag("bridge", "yes") || way.hasTag("highway", "steps"))
        {
            // do not change speed
            // note: although tunnel can have a difference in elevation it is very unlikely that the elevation data is correct for a tunnel
        } else
        {
    
    */

    
    // Adopts weight 
    private double applyEle( EdgeIteratorState edge, double weight, boolean reverse )
    {
        /* PointList pl = edge.fetchWayGeometry(3);
        if (!pl.is3D())
            throw new IllegalStateException("To support speed calculation based on elevation data it is necessary to enable import of it.");
        */

        long flags = edge.getFlags();
            // Decrease the speed for ele increase (incline), and decrease the speed for ele decrease (decline). The speed-decrease 
            // has to be bigger (compared to the speed-increase) for the same elevation difference to simulate loosing energy and avoiding hills.
            // For the reverse speed this has to be the opposite but again keeping in mind that up+down difference.
            double incEleSum = 0, incDist2DSum = 0;
            double decEleSum = 0, decDist2DSum = 0;
            // double prevLat = pl.getLatitude(0), prevLon = pl.getLongitude(0);
            //double prevEle = pl.getElevation(0);
            double prevEle = nodeAccess.getElevation(edge.getBaseNode());

            double fullDist2D = edge.getDistance();

            if (Double.isInfinite(fullDist2D))
            {
                System.err.println("infinity distance? for edge:" + edge.getEdge());
                return weight;
            }
            // for short edges an incline makes no sense and for 0 distances could lead to NaN values for speed, see #432
            if (fullDist2D < 1)
                return weight;

            // double eleDelta = pl.getElevation(pl.size() - 1) - prevEle;
            double eleDelta = nodeAccess.getElevation(edge.getAdjNode()) - prevEle;
            if (eleDelta > 0.1)
            {
                incEleSum = eleDelta;
                incDist2DSum = fullDist2D;
            } else if (eleDelta < -0.1)
            {
                decEleSum = -eleDelta;
                decDist2DSum = fullDist2D;
            }

//            // get a more detailed elevation information, but due to bad SRTM data this does not make sense now.
//            for (int i = 1; i < pl.size(); i++)
//            {
//                double lat = pl.getLatitude(i);
//                double lon = pl.getLongitude(i);
//                double ele = pl.getElevation(i);
//                double eleDelta = ele - prevEle;
//                double dist2D = distCalc.calcDist(prevLat, prevLon, lat, lon);
//                if (eleDelta > 0.1)
//                {
//                    incEleSum += eleDelta;
//                    incDist2DSum += dist2D;
//                } else if (eleDelta < -0.1)
//                {
//                    decEleSum += -eleDelta;
//                    decDist2DSum += dist2D;
//                }
//                fullDist2D += dist2D;
//                prevLat = lat;
//                prevLon = lon;
//                prevEle = ele;
//            }
            // Calculate slop via tan(asin(height/distance)) but for rather smallish angles where we can assume tan a=a and sin a=a.
            // Then calculate a factor which decreases or increases the speed.
            // Do this via a simple quadratic equation where y(0)=1 and y(0.3)=1/4 for incline and y(0.3)=2 for decline        
            double fwdIncline = incDist2DSum > 1 ? incEleSum / incDist2DSum : 0;
            double fwdDecline = decDist2DSum > 1 ? decEleSum / decDist2DSum : 0;
            double restDist2D = fullDist2D - incDist2DSum - decDist2DSum;
            
            double elefactor;            

            if (!reverse)
            {
                // use weighted mean so that longer incline infuences speed more than shorter
                double fwdFaster = 1 + 2 * com.graphhopper.util.Helper.keepIn(fwdDecline, 0, 0.2);
                fwdFaster = fwdFaster * fwdFaster;
                double fwdSlower = 1 - 4 * ascendAvoidance * com.graphhopper.util.Helper.keepIn(fwdIncline, 0, 0.2);
                fwdSlower = fwdSlower * fwdSlower;
                elefactor = (fwdSlower * incDist2DSum + fwdFaster * decDist2DSum + 1 * restDist2D) / fullDist2D;
                return weight * com.graphhopper.util.Helper.keepIn(1.0 / elefactor , 1.0/10.0, 10.0);
            }
            else
            {               
                double bwFaster = 1 + 2 * com.graphhopper.util.Helper.keepIn(fwdIncline, 0, 0.2);
                bwFaster = bwFaster * bwFaster;
                double bwSlower = 1 - 4 * ascendAvoidance * com.graphhopper.util.Helper.keepIn(fwdDecline, 0, 0.2);
                bwSlower = bwSlower * bwSlower;
                elefactor = (bwFaster * incDist2DSum + bwSlower * decDist2DSum + 1 * restDist2D) / fullDist2D;
                return weight * com.graphhopper.util.Helper.keepIn(1.0 / elefactor , 1.0/10.0, 10.0);
            }
    }
    
}