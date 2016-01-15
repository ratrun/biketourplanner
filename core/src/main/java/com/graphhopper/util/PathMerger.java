/*
 *  Licensed to Peter Karich under one or more contributor license
 *  agreements. See the NOTICE file distributed with this work for
 *  additional information regarding copyright ownership.
 *
 *  Peter Karich licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License. You may obtain a copy of the
 *  License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
package com.graphhopper.util;

import com.graphhopper.GHResponse;
import com.graphhopper.routing.Path;

import java.util.List;

/**
 * This class merges a list of points into one point recognizing the specified places.
 * <p>
 * @author Peter Karich
 * @author ratrun
 */
public class PathMerger
{
    private boolean enableInstructions = true;
    private boolean simplifyResponse = true;
    private DouglasPeucker douglasPeucker;
    private boolean calcPoints = true;
    private double ascendMeters;
    private double descendMeters;
   
    private void calcAscendDescendWithSmoothing(final double field[], double smoothing ) {

        // Smoothing algorithm according to http://phrogz.net/js/framerate-independent-low-pass-filter.html
        // The higher the smoothing value becomes, the more aggressive the filter get. A smoothing value 
        // of one leads to the original input values.
        // Note: This algorithm can only caculate an estimate for the ascend and descend meters.
        // http://regex.info/blog/2015-05-09/2568 provides a good documentation that such an algorithm will 
        // never be able to calculate correct values.

        double value=field[0];
        // Forward direction
        double field_sc[] = new double[field.length];
        for (int i=0;i<field.length;++i)
        {
            double currentValue=field[i];
            value+= (currentValue-value)/smoothing;
            field_sc[i]=value;
        }
        // Backward direction
        value=field[field.length-1];
        double[] field_scb = new double[field.length];
        for (int i=field.length-1;i>=0;--i)
        {
            double currentValue=field[i];
            value+= (currentValue-value)/smoothing;
            field_scb[i]=value;
        }
        ascendMeters = 0;
        descendMeters = 0;
        double lastele = field_sc[0];
        for (int i=0;i<field.length;++i)
        {
            // Mean value of forward and backward:
            field_sc[i]=(field_sc[i]+field_scb[i])/2;
            double ele = field_sc[i];
            double diff = Math.abs(ele - lastele);

            if (ele>lastele)
               ascendMeters += diff;
            else
               descendMeters  += diff;

            lastele=ele;

        }
        ascendMeters = Math.round(ascendMeters);
        descendMeters = Math.round(descendMeters);
    }

    public void doWork( GHResponse rsp, List<Path> paths, Translation tr )
    {
        int origPoints = 0;
        long fullTimeInMillis = 0;
        double fullWeight = 0;
        double fullDistance = 0;
        boolean allFound = true;

        InstructionList fullInstructions = new InstructionList(tr);
        PointList fullPoints = PointList.EMPTY;
        for (int pathIndex = 0; pathIndex < paths.size(); pathIndex++)
        {
            Path path = paths.get(pathIndex);
            fullTimeInMillis += path.getTime();
            fullDistance += path.getDistance();
            fullWeight += path.getWeight();
            if (enableInstructions)
            {
                InstructionList il = path.calcInstructions(tr);

                if (!il.isEmpty())
                {
                    if (fullPoints.isEmpty())
                    {
                        PointList pl = il.get(0).getPoints();
                        // do a wild guess about the total number of points to avoid reallocation a bit
                        fullPoints = new PointList(il.size() * Math.min(10, pl.size()), pl.is3D());
                    }

                    for (Instruction i : il)
                    {
                        if (simplifyResponse)
                        {
                            origPoints += i.getPoints().size();
                            douglasPeucker.simplify(i.getPoints());
                        }
                        fullInstructions.add(i);
                        fullPoints.add(i.getPoints());
                    }

                    // if not yet reached finish replace with 'reached via'
                    if (pathIndex + 1 < paths.size())
                    {
                        ViaInstruction newInstr = new ViaInstruction(fullInstructions.get(fullInstructions.size() - 1));
                        newInstr.setViaCount(pathIndex + 1);
                        fullInstructions.replaceLast(newInstr);
                    }
                }

            } else if (calcPoints)
            {
                PointList tmpPoints = path.calcPoints();
                if (fullPoints.isEmpty())
                    fullPoints = new PointList(tmpPoints.size(), tmpPoints.is3D());

                if (simplifyResponse)
                {
                    origPoints = tmpPoints.getSize();
                    douglasPeucker.simplify(tmpPoints);
                }
                fullPoints.add(tmpPoints);
            }

            allFound = allFound && path.isFound();
        }

        if (!fullPoints.isEmpty())
        {
            String debug = rsp.getDebugInfo() + ", simplify (" + origPoints + "->" + fullPoints.getSize() + ")";
            rsp.setDebugInfo(debug);
            if (fullPoints.is3D)
            {
                int size = fullPoints.getSize();
                double eleinArr[] = new double[size];
                double ele = fullPoints.getElevation(0);

                // Perform calcAscendDescend with smoothing of elevation
                for (int i = 0; i < size; i++)
                {
                  boolean last = i + 1 == size;
                  double nextEle = last ? fullPoints.getElevation(i) : fullPoints.getElevation(i + 1);
                  eleinArr[i]=ele;

                  ele = nextEle;
                }
                calcAscendDescendWithSmoothing(eleinArr, 5);
            }
        }

        if (enableInstructions)
        {
            rsp.setInstructions(fullInstructions);
            rsp.setWayTypeInfo(calcWayTypeInfo(paths,tr));
        }

        if (!allFound)
        {
            rsp.addError(new RuntimeException("Connection between locations not found"));
        }

        rsp.setAscend(ascendMeters);
        rsp.setDescend(descendMeters);

        rsp.setPoints(fullPoints).
                setRouteWeight(fullWeight).
                setDistance(fullDistance).
                setTime(fullTimeInMillis);
    }

    public PathMerger setCalcPoints( boolean calcPoints )
    {
        this.calcPoints = calcPoints;
        return this;
    }

    public PathMerger setDouglasPeucker( DouglasPeucker douglasPeucker )
    {
        this.douglasPeucker = douglasPeucker;
        return this;
    }

    public PathMerger setSimplifyResponse( boolean simplifyRes )
    {
        this.simplifyResponse = simplifyRes;
        return this;
    }

    public PathMerger setEnableInstructions( boolean enableInstructions )
    {
        this.enableInstructions = enableInstructions;
        return this;
    }

    public WayTypeInfo calcWayTypeInfo(List<Path> pathList, Translation tr)
    {
        WayTypeInfo res = new WayTypeInfo();
        for (Path path : pathList)
        {
            if (path.getDistance()!=0)
            {
               WayTypeInfo segment = path.calcWayTypeInfo(tr);
               res.addDistances(segment);
            }
        }
        return res;
    }

}
