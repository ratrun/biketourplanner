/*
 *  Licensed to GraphHopper and Peter Karich under one or more contributor
 *  license agreements. See the NOTICE file distributed with this work for 
 *  additional information regarding copyright ownership.
 *
 *  GraphHopper licenses this file to you under the Apache License, 
 *  Version 2.0 (the "License"); you may not use this file except in 
 *  compliance with the License. You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
package com.graphhopper.routing.util;

import com.graphhopper.routing.VirtualEdgeIteratorState;
import com.graphhopper.storage.NodeAccess;
import com.graphhopper.util.EdgeIterator;
import com.graphhopper.util.GHUtility;
import com.graphhopper.util.Helper;
import com.graphhopper.util.PMap;
import org.junit.Test;

import static org.junit.Assert.assertEquals;

/**
 * @author Peter Karich
 */
public class ElevationWeightingTest
{
    private final FlagEncoder encoder = new EncodingManager("bike").getEncoder("bike");

    @Test
    public void testWeightWrongHeading()
    {
        VirtualEdgeIteratorState virtEdge = new VirtualEdgeIteratorState(0, 1, 1, 2, 10,
                encoder.setProperties(10, true, true), "test", Helper.createPointList3D(51, 0, 100, 51, 1, 100));
        PriorityWeighting prioinstance = new PriorityWeighting(encoder);
        double originaltime = prioinstance.calcWeight(virtEdge, false, 0);        

        EleWeighting eleinstance = new EleWeighting(encoder, new PMap().put("weighthing", "elevation").put("ascendAvoidance","1.0"), null);
        assertEquals(originaltime, eleinstance.calcWeight(virtEdge, false, 0), 1e-8);
        
        virtEdge = new VirtualEdgeIteratorState(0, 1, 1, 2, 10,
                encoder.setProperties(10, true, true), "test", Helper.createPointList3D(51, 0, 100, 51, 1, 300));
        assertEquals(originaltime * 10.0, eleinstance.calcWeight(virtEdge, false, 0), 1e-8);
        
        eleinstance = new EleWeighting(encoder, new PMap().put("weighthing", "elevation").put("ascendAvoidance","0.0"), null);
        assertEquals(originaltime, eleinstance.calcWeight(virtEdge, false, 0), 1e-8);

        eleinstance = new EleWeighting(encoder, new PMap().put("weighthing", "elevation").put("ascendAvoidance","-1.0"), null);
        assertEquals(originaltime / 10, eleinstance.calcWeight(virtEdge, false, 0), 1e-8);
        
    }


    EdgeIterator createEdge( final double distance, final long flags )
    {
        return new GHUtility.DisabledEdgeIterator()
        {
            @Override
            public double getDistance()
            {
                return distance;
            }

            @Override
            public long getFlags()
            {
                return flags;
            }

            @Override
            public boolean getBoolean( int key, boolean reverse, boolean _default )
            {
                return _default;
            }
        };
    }
}
